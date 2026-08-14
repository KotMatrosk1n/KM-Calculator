// SPDX-License-Identifier: MIT

using System.Runtime.InteropServices;

namespace KMCalculator.Setup.Launcher;

internal static class LegacyShellCleanup
{
    private const string LegacyApplicationId = "com.kotmatrosk1n.pokemonroyalsword";

    internal static void RemoveDestinations(IEnumerable<string> shortcutPaths)
    {
        var destinations = (IApplicationDestinations)new ApplicationDestinations();
        try
        {
            destinations.SetAppID(LegacyApplicationId);
            destinations.RemoveAllDestinations();
        }
        finally
        {
            Marshal.FinalReleaseComObject(destinations);
        }

        var customDestinations = (ICustomDestinationList)new CustomDestinationList();
        try
        {
            customDestinations.SetAppID(LegacyApplicationId);
            customDestinations.DeleteList(LegacyApplicationId);
        }
        finally
        {
            Marshal.FinalReleaseComObject(customDestinations);
        }

        var pinnedList = (IStartMenuPinnedList)new StartMenuPin();
        try
        {
            foreach (var shortcutPath in shortcutPaths.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                FileAttributes attributes;
                try
                {
                    attributes = File.GetAttributes(shortcutPath);
                }
                catch (FileNotFoundException)
                {
                    continue;
                }
                catch (DirectoryNotFoundException)
                {
                    continue;
                }
                if ((attributes & (FileAttributes.Directory | FileAttributes.ReparsePoint)) != 0)
                {
                    throw new IOException($"The old shortcut is not a safe file: {shortcutPath}");
                }

                var shellItemId = typeof(IShellItem).GUID;
                SHCreateItemFromParsingName(shortcutPath, nint.Zero, ref shellItemId, out var shellItem);
                try
                {
                    pinnedList.RemoveFromList(shellItem);
                }
                finally
                {
                    Marshal.FinalReleaseComObject(shellItem);
                }
            }
        }
        finally
        {
            Marshal.FinalReleaseComObject(pinnedList);
        }
    }

    [ComImport]
    [Guid("86C14003-4D6B-4EF3-A7B4-0506663B2E68")]
    private class ApplicationDestinations;

    [ComImport]
    [Guid("12337D35-94C6-48A0-BCE7-6A9C69D4D600")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IApplicationDestinations
    {
        void SetAppID([MarshalAs(UnmanagedType.LPWStr)] string appId);
        void RemoveDestination([MarshalAs(UnmanagedType.IUnknown)] object destination);
        void RemoveAllDestinations();
    }

    [ComImport]
    [Guid("77F10CF0-3DB5-4966-B520-B7C54FD35ED6")]
    private class CustomDestinationList;

    [ComImport]
    [Guid("6332DEBF-87B5-4670-90C0-5E57B408A49E")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface ICustomDestinationList
    {
        void SetAppID([MarshalAs(UnmanagedType.LPWStr)] string appId);
        void BeginList(out uint minimumSlots, ref Guid interfaceId, [MarshalAs(UnmanagedType.Interface)] out object removedItems);
        void AppendCategory([MarshalAs(UnmanagedType.LPWStr)] string category, [MarshalAs(UnmanagedType.Interface)] object objects);
        void AppendKnownCategory(int category);
        void AddUserTasks([MarshalAs(UnmanagedType.Interface)] object objects);
        void CommitList();
        void GetRemovedDestinations(ref Guid interfaceId, [MarshalAs(UnmanagedType.Interface)] out object removedItems);
        void DeleteList([MarshalAs(UnmanagedType.LPWStr)] string appId);
        void AbortList();
    }

    [ComImport]
    [Guid("A2A9545D-A0C2-42B4-9708-A0B2BADD77C8")]
    private class StartMenuPin;

    [ComImport]
    [Guid("4CD19ADA-25A5-4A32-B3B7-347BEE5BE36B")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IStartMenuPinnedList
    {
        void RemoveFromList([MarshalAs(UnmanagedType.Interface)] object shellItem);
    }

    [ComImport]
    [Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellItem
    {
        void BindToHandler(nint bindContext, ref Guid bindHandler, ref Guid interfaceId, out nint result);
        void GetParent([MarshalAs(UnmanagedType.Interface)] out object parent);
        void GetDisplayName(uint displayNameType, out nint name);
        void GetAttributes(uint mask, out uint attributes);
        void Compare([MarshalAs(UnmanagedType.Interface)] object other, uint hint, out int order);
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    private static extern void SHCreateItemFromParsingName(
        string path,
        nint bindContext,
        ref Guid interfaceId,
        [MarshalAs(UnmanagedType.Interface)] out object shellItem);
}
