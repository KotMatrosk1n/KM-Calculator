// SPDX-License-Identifier: MIT
using System.Windows;

namespace KMCalculator.Setup.UI;

internal partial class SetupQuestion : Window
{
    internal SetupQuestion(Window owner, string heading, string description, string accept, string cancel)
    {
        InitializeComponent();
        Owner = owner;
        Width = Math.Min(540, owner.Width);
        DataContext = new { Heading = heading, Description = description, Accept = accept, Cancel = cancel };
        Loaded += (_, _) => CancelButton.Focus();
    }
    private void AcceptClicked(object sender, RoutedEventArgs e) => DialogResult = true;
}
