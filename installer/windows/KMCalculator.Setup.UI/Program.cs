// SPDX-License-Identifier: MIT
using WixToolset.BootstrapperApplicationApi;

namespace KMCalculator.Setup.UI;

internal static class Program
{
    // Burn creates the STA UI thread. Its entry/connection thread must remain MTA.
    private static int Main()
    {
        try { ManagedBootstrapperApplication.Run(new CalculatorBootstrapper()); return 0; }
        catch (Exception exception) { return System.Runtime.InteropServices.Marshal.GetHRForException(exception); }
    }
}
