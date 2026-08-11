// SPDX-License-Identifier: MIT

using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Cryptography;

namespace KMCalculator.Setup.Launcher;

internal static class Program
{
    private const int ErrorInvalidParameter = 87;
    private const int ErrorBadExeFormat = 193;
    private const int ErrorCrc = 23;
    private const int ErrorInstallFailure = 1603;
    private const uint MbIconError = 0x00000010;
    private const uint MbOk = 0x00000000;

    [STAThread]
    private static int Main(string[] args)
    {
        if (!LauncherArguments.TryParse(args, out var parsed, out var argumentError) || parsed is null)
        {
            ShowError(argumentError ?? "The setup command line is invalid.", suppress: args.Any(IsQuietLike));
            return ErrorInvalidParameter;
        }

        try
        {
            using var bundle = EmbeddedBundle.ExtractAndVerify();
            var startInfo = new ProcessStartInfo
            {
                FileName = bundle.ExecutablePath,
                UseShellExecute = false,
                WorkingDirectory = Path.GetDirectoryName(bundle.ExecutablePath)!
            };
            foreach (var argument in parsed.BurnArguments)
            {
                startInfo.ArgumentList.Add(argument);
            }

            using var process = Process.Start(startInfo)
                ?? throw new Win32Exception("The embedded setup bundle could not be started.");
            process.WaitForExit();
            var exitCode = process.ExitCode;

            if (exitCode == 0 && parsed.RelaunchAfterSuccess && !InstalledApplication.TryLaunch(out var launchError))
            {
                ShowError(launchError ?? "KM Calculator could not be started.", parsed.SuppressErrors);
            }

            return exitCode;
        }
        catch (BadImageFormatException exception)
        {
            ShowError(exception.Message, parsed.SuppressErrors);
            return ErrorBadExeFormat;
        }
        catch (CryptographicException exception)
        {
            ShowError(exception.Message, parsed.SuppressErrors);
            return ErrorCrc;
        }
        catch (Exception exception)
        {
            ShowError($"KM Calculator Setup could not start: {exception.Message}", parsed.SuppressErrors);
            return ErrorInstallFailure;
        }
    }

    private static bool IsQuietLike(string argument) =>
        argument.Equals("/S", StringComparison.OrdinalIgnoreCase) ||
        argument.Equals("/quiet", StringComparison.OrdinalIgnoreCase);

    private static void ShowError(string message, bool suppress)
    {
        if (!suppress)
        {
            MessageBoxW(IntPtr.Zero, message, "KM Calculator Setup", MbOk | MbIconError);
        }
    }

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);
}
