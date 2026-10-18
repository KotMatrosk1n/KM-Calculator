// SPDX-License-Identifier: MIT
using System.ComponentModel;
using System.Diagnostics;
using System.Windows;
using System.Windows.Interop;

namespace KMCalculator.Setup.UI;

internal partial class SetupWindow : Window
{
    private readonly SetupState state;
    private bool mayClose;
    internal event Action? PrimaryRequested;
    internal event Action? UninstallRequested;
    internal event Action? CancelRequested;
    internal event Action? RestartRequested;
    internal event Action? ExitRequested;

    internal SetupWindow(SetupState state)
    {
        this.state = state;
        InitializeComponent();
        DataContext = state;
        SourceInitialized += (_, _) => FitWorkArea();
        DpiChanged += (_, _) => FitWorkArea();
    }

    private void FitWorkArea()
    {
        var handle = new WindowInteropHelper(this).Handle;
        var monitor = MonitorFromWindow(handle, 2);
        var info = new MonitorInfo { Size = System.Runtime.InteropServices.Marshal.SizeOf<MonitorInfo>() };
        if (!GetMonitorInfo(monitor, ref info)) return;
        var dpi = System.Windows.Media.VisualTreeHelper.GetDpi(this);
        var availableWidth = (info.Work.Right - info.Work.Left) / dpi.DpiScaleX;
        var availableHeight = (info.Work.Bottom - info.Work.Top) / dpi.DpiScaleY;
        MaxHeight = Math.Max(1, availableHeight - 16);
        MinHeight = Math.Min(440, MaxHeight);
        Width = Math.Min(760, Math.Max(1, availableWidth - 16));
    }

    private void PrimaryClicked(object sender, RoutedEventArgs e) => PrimaryRequested?.Invoke();
    private void UninstallClicked(object sender, RoutedEventArgs e)
    {
        if (state.Operation != SetupOperation.Uninstall)
        {
            state.Operation = SetupOperation.Uninstall;
            state.Refresh();
        }
        else UninstallRequested?.Invoke();
    }
    private void RestartClicked(object sender, RoutedEventArgs e) => RestartRequested?.Invoke();
    private void CloseClicked(object sender, RoutedEventArgs e) => Close();
    private void ClosingWindow(object? sender, CancelEventArgs e)
    {
        if (mayClose) return;
        e.Cancel = true;
        if (state.Cancelling) return;
        if (state.Busy)
        {
            if (Ask("Cancel setup?", "Setup will stop at the next safe point and roll back changes where possible. Please keep this window open until it finishes.", "Cancel setup", "Keep going"))
                CancelRequested?.Invoke();
        }
        else ExitRequested?.Invoke();
    }
    private void LogClicked(object sender, RoutedEventArgs e)
    {
        try { Process.Start(new ProcessStartInfo { FileName = state.LogPath, UseShellExecute = true }); }
        catch { Ask("Setup log unavailable", "Windows could not open the setup log. Its location is shown in the error details.", "OK", "Close"); }
    }
    internal bool Ask(string heading, string description, string accept, string cancel) =>
        new SetupQuestion(this, heading, description, accept, cancel).ShowDialog() == true;
    internal void Finish() { mayClose = true; Close(); }

    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
    private struct Rect { public int Left, Top, Right, Bottom; }
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
    private struct MonitorInfo { public int Size; public Rect Monitor, Work; public uint Flags; }
    [System.Runtime.InteropServices.DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr window, uint flags);
    [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto)]
    [return: System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.Bool)]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
}
