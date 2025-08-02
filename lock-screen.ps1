param(
    [string]$Action = "lock",
    [string]$MasterPassword = "SNEH_MASTER_2024",
    [string]$UserPassword = "user123"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Hide taskbar function
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Taskbar {
    [DllImport("user32.dll")]
    public static extern int FindWindow(string className, string windowText);
    [DllImport("user32.dll")]
    public static extern int ShowWindow(int hwnd, int command);
    
    public static void Hide() {
        int hwnd = FindWindow("Shell_TrayWnd", "");
        ShowWindow(hwnd, 0);
    }
    
    public static void Show() {
        int hwnd = FindWindow("Shell_TrayWnd", "");
        ShowWindow(hwnd, 5);
    }
}
"@

if ($Action -eq "lock") {
    Write-Host "Enterprise lock screen activated - waiting for authentication"
    
    # Hide taskbar
    [Taskbar]::Hide()
    
    # Get screen dimensions
    $screenWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
    $screenHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height
    
    # Load enterprise logo image
    $logoImage = $null
    $logoPath = Join-Path $PSScriptRoot "enterprise.jpg"
    if (Test-Path $logoPath) {
        try {
            $logoImage = [System.Drawing.Image]::FromFile($logoPath)
            Write-Host "Enterprise logo loaded successfully"
        } catch {
            Write-Host "Failed to load logo image: $($_.Exception.Message)"
        }
    } else {
        Write-Host "Logo file not found at: $logoPath"
    }
    
    # Create main form
    $form = New-Object System.Windows.Forms.Form
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $form.WindowState = [System.Windows.Forms.FormWindowState]::Maximized
    $form.TopMost = $true
    $form.ShowInTaskbar = $false
    $form.Text = "Device Locked - Sneh Creation"
    $form.KeyPreview = $true
    $form.BackColor = [System.Drawing.Color]::Black
    
    # Create animated gradient background with random shapes
    $form.Add_Paint({
        param($sender, $e)
        
        # Enhanced dark gradient background
        $rect = New-Object System.Drawing.Rectangle(0, 0, $screenWidth, $screenHeight)
        $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $rect,
            [System.Drawing.Color]::FromArgb(12, 18, 35),
            [System.Drawing.Color]::FromArgb(25, 35, 55),
            [System.Drawing.Drawing2D.LinearGradientMode]::BackwardDiagonal
        )
        $e.Graphics.FillRectangle($bgBrush, $rect)
        
        # Add random gradient shapes with better colors
        $random = New-Object System.Random(12345)
        for ($i = 0; $i -lt 18; $i++) {
            $shapeX = $random.Next(0, $screenWidth - 200)
            $shapeY = $random.Next(0, $screenHeight - 200)
            $shapeSize = $random.Next(120, 320)
            
            $shapeRect = New-Object System.Drawing.Rectangle($shapeX, $shapeY, $shapeSize, $shapeSize)
            
            # Enhanced gradient colors for better visual appeal
            $color1 = [System.Drawing.Color]::FromArgb(30, $random.Next(80, 200), $random.Next(120, 255), $random.Next(150, 255))
            $color2 = [System.Drawing.Color]::FromArgb(15, $random.Next(40, 120), $random.Next(60, 150), $random.Next(80, 180))
            
            $shapeBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
                $shapeRect,
                $color1,
                $color2,
                [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
            )
            
            # Draw random shapes with better distribution
            if ($i % 4 -eq 0) {
                $e.Graphics.FillEllipse($shapeBrush, $shapeRect)
            } elseif ($i % 4 -eq 1) {
                $e.Graphics.FillRectangle($shapeBrush, $shapeRect)
            } elseif ($i % 4 -eq 2) {
                # Triangle
                $points = @(
                    [System.Drawing.Point]::new($shapeX + $shapeSize/2, $shapeY),
                    [System.Drawing.Point]::new($shapeX, $shapeY + $shapeSize),
                    [System.Drawing.Point]::new($shapeX + $shapeSize, $shapeY + $shapeSize)
                )
                $e.Graphics.FillPolygon($shapeBrush, $points)
            } else {
                # Diamond
                $points = @(
                    [System.Drawing.Point]::new($shapeX + $shapeSize/2, $shapeY),
                    [System.Drawing.Point]::new($shapeX + $shapeSize, $shapeY + $shapeSize/2),
                    [System.Drawing.Point]::new($shapeX + $shapeSize/2, $shapeY + $shapeSize),
                    [System.Drawing.Point]::new($shapeX, $shapeY + $shapeSize/2)
                )
                $e.Graphics.FillPolygon($shapeBrush, $points)
            }
            
            $shapeBrush.Dispose()
        }
        
        $bgBrush.Dispose()
    })
    
    # Create glass center panel with enhanced transparency
    $centerPanel = New-Object System.Windows.Forms.Panel
    $centerPanel.Size = New-Object System.Drawing.Size(500, 500)
    $centerPanel.Location = New-Object System.Drawing.Point(
        [Math]::Floor(($screenWidth - 500) / 2),
        [Math]::Floor(($screenHeight - 500) / 2)
    )
    $centerPanel.BackColor = [System.Drawing.Color]::Transparent
    
    # Enhanced glass effect for panel (fixed)
    $centerPanel.Add_Paint({
        param($sender, $e)
        $panelWidth = 500
        $panelHeight = 500
        $rect = New-Object System.Drawing.Rectangle(0, 0, $panelWidth, $panelHeight)
        
        # Create proper glass effect with acrylic background
        $acrylicBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 245, 245, 255))
        $e.Graphics.FillRectangle($acrylicBrush, $rect)
        
        # Add frosted glass layer
        $frostBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 255, 255, 255))
        $e.Graphics.FillRectangle($frostBrush, $rect)
        
        # Top highlight for glass effect
        $highlightRect = New-Object System.Drawing.Rectangle(0, 0, $panelWidth, 40)
        $highlightBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $highlightRect,
            [System.Drawing.Color]::FromArgb(80, 255, 255, 255),
            [System.Drawing.Color]::FromArgb(20, 255, 255, 255),
            [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
        )
        $e.Graphics.FillRectangle($highlightBrush, $highlightRect)
        
        # Glass border with multiple layers
        $outerBorderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 220, 230, 255), 2)
        $e.Graphics.DrawRectangle($outerBorderPen, 0, 0, ($panelWidth - 1), ($panelHeight - 1))
        
        $innerBorderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 255, 255, 255), 1)
        $e.Graphics.DrawRectangle($innerBorderPen, 1, 1, ($panelWidth - 3), ($panelHeight - 3))
        
        $acrylicBrush.Dispose()
        $frostBrush.Dispose()
        $highlightBrush.Dispose()
        $outerBorderPen.Dispose()
        $innerBorderPen.Dispose()
    })
    
    # Enterprise Logo (Increased size)
    $logoPanel = New-Object System.Windows.Forms.Panel
    $logoPanel.Size = New-Object System.Drawing.Size(200, 200)
    $logoPanel.Location = New-Object System.Drawing.Point(150, 20)
    $logoPanel.BackColor = [System.Drawing.Color]::Transparent
    
    $logoPanel.Add_Paint({
        param($sender, $e)
        
        if ($logoImage -ne $null) {
            # Draw the actual logo image (larger size)
            $logoRect = New-Object System.Drawing.Rectangle(10, 10, 180, 180)
            
            # Create circular clipping path for logo
            $logoPath = New-Object System.Drawing.Drawing2D.GraphicsPath
            $logoPath.AddEllipse($logoRect)
            $e.Graphics.SetClip($logoPath)
            
            # Draw logo image with high quality
            $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $e.Graphics.DrawImage($logoImage, $logoRect)
            $e.Graphics.ResetClip()
            
            # Add modern circular border
            $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 70, 130, 255), 4)
            $e.Graphics.DrawEllipse($borderPen, $logoRect)
            
            $logoPath.Dispose()
            $borderPen.Dispose()
        } else {
            # Fallback if image not loaded (larger size)
            $logoRect = New-Object System.Drawing.Rectangle(10, 10, 180, 180)
            
            # Modern gradient for logo background
            $logoBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
                $logoRect,
                [System.Drawing.Color]::FromArgb(70, 130, 255),
                [System.Drawing.Color]::FromArgb(130, 70, 255),
                [System.Drawing.Drawing2D.LinearGradientMode]::BackwardDiagonal
            )
            $e.Graphics.FillEllipse($logoBrush, $logoRect)
            
            # Logo text (larger)
            $logoFont = New-Object System.Drawing.Font("Segoe UI", 28)
            $logoTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
            $logoTextRect = New-Object System.Drawing.RectangleF(10, 80, 180, 60)
            $logoFormat = New-Object System.Drawing.StringFormat
            $logoFormat.Alignment = [System.Drawing.StringAlignment]::Center
            $logoFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
            $e.Graphics.DrawString("SNEH", $logoFont, $logoTextBrush, $logoTextRect, $logoFormat)
            
            $logoBrush.Dispose()
            $logoFont.Dispose()
            $logoTextBrush.Dispose()
            $logoFormat.Dispose()
        }
    })
    
    # Company name (increased size)
    $companyLabel = New-Object System.Windows.Forms.Label
    $companyLabel.Text = "Sneh Creation"
    $companyLabel.Font = New-Object System.Drawing.Font("Segoe UI", 32)
    $companyLabel.ForeColor = [System.Drawing.Color]::FromArgb(40, 50, 70)
    $companyLabel.BackColor = [System.Drawing.Color]::Transparent
    $companyLabel.Size = New-Object System.Drawing.Size(460, 50)
    $companyLabel.Location = New-Object System.Drawing.Point(20, 230)
    $companyLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    
    # Time and date display (DD/MM/YYYY hh:mm AM/PM IST format)
    $timeLabel = New-Object System.Windows.Forms.Label
    # Calculate IST time (UTC + 5:30) and format as DD/MM/YYYY hh:mm AM/PM
    $istTime = [System.DateTime]::UtcNow.AddHours(5).AddMinutes(30)
    $timeLabel.Text = $istTime.ToString("dd/MM/yyyy hh:mm tt") + " IST"
    $timeLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16)
    $timeLabel.ForeColor = [System.Drawing.Color]::FromArgb(80, 90, 110)
    $timeLabel.BackColor = [System.Drawing.Color]::Transparent
    $timeLabel.Size = New-Object System.Drawing.Size(460, 35)
    $timeLabel.Location = New-Object System.Drawing.Point(20, 290)
    $timeLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    
    # Fluent 2 Password input container
    $passwordContainer = New-Object System.Windows.Forms.Panel
    $passwordContainer.Size = New-Object System.Drawing.Size(350, 55)
    $passwordContainer.Location = New-Object System.Drawing.Point(75, 340)
    $passwordContainer.BackColor = [System.Drawing.Color]::Transparent
    
    # Fluent 2 password container styling (fixed)
    $passwordContainer.Add_Paint({
        param($sender, $e)
        $containerWidth = 350
        $containerHeight = 55
        $rect = New-Object System.Drawing.Rectangle(0, 0, $containerWidth, $containerHeight)
        
        # Fluent 2 acrylic background
        $acrylicBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 250, 250, 255))
        $e.Graphics.FillRectangle($acrylicBrush, $rect)
        
        # Fluent 2 subtle inner glow
        $innerRect = New-Object System.Drawing.Rectangle(1, 1, ($containerWidth - 2), ($containerHeight - 2))
        $innerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 255, 255, 255))
        $e.Graphics.FillRectangle($innerBrush, $innerRect)
        
        # Fluent 2 modern border
        $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 70, 130, 255), 2)
        $e.Graphics.DrawRectangle($borderPen, 0, 0, ($containerWidth - 1), ($containerHeight - 1))
        
        # Top highlight for depth
        $highlightPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 255, 255, 255), 1)
        $e.Graphics.DrawLine($highlightPen, 1, 1, ($containerWidth - 2), 1)
        
        $acrylicBrush.Dispose()
        $innerBrush.Dispose()
        $borderPen.Dispose()
        $highlightPen.Dispose()
    })
    
    $passwordBox = New-Object System.Windows.Forms.TextBox
    $passwordBox.Size = New-Object System.Drawing.Size(330, 35)
    $passwordBox.Location = New-Object System.Drawing.Point(10, 10)
    $passwordBox.Font = New-Object System.Drawing.Font("Segoe UI", 18)
    $passwordBox.UseSystemPasswordChar = $true
    $passwordBox.BackColor = [System.Drawing.Color]::White
    $passwordBox.ForeColor = [System.Drawing.Color]::FromArgb(40, 50, 70)
    $passwordBox.BorderStyle = [System.Windows.Forms.BorderStyle]::None
    $passwordBox.TextAlign = [System.Windows.Forms.HorizontalAlignment]::Center
    
    # Fluent 2 Placeholder
    $placeholderLabel = New-Object System.Windows.Forms.Label
    $placeholderLabel.Text = "Enter Password"
    $placeholderLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16)
    $placeholderLabel.ForeColor = [System.Drawing.Color]::FromArgb(120, 130, 150)
    $placeholderLabel.BackColor = [System.Drawing.Color]::Transparent
    $placeholderLabel.Size = New-Object System.Drawing.Size(330, 35)
    $placeholderLabel.Location = New-Object System.Drawing.Point(10, 10)
    $placeholderLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    
    # Hide placeholder when typing
    $passwordBox.Add_TextChanged({
        $placeholderLabel.Visible = ($passwordBox.Text.Length -eq 0)
    })
    
    # Fluent 2 Unlock button
    $unlockButton = New-Object System.Windows.Forms.Button
    $unlockButton.Text = "Unlock"
    $unlockButton.Size = New-Object System.Drawing.Size(160, 50)
    $unlockButton.Location = New-Object System.Drawing.Point(170, 415)
    $unlockButton.Font = New-Object System.Drawing.Font("Segoe UI", 16)
    $unlockButton.ForeColor = [System.Drawing.Color]::White
    $unlockButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $unlockButton.FlatAppearance.BorderSize = 0
    $unlockButton.Cursor = [System.Windows.Forms.Cursors]::Hand
    $unlockButton.UseVisualStyleBackColor = $false
    $unlockButton.BackColor = [System.Drawing.Color]::Transparent
    
    # Fluent 2 custom button painting
    $unlockButton.Add_Paint({
        param($sender, $e)
        $buttonWidth = 160
        $buttonHeight = 50
        $rect = New-Object System.Drawing.Rectangle(0, 0, $buttonWidth, $buttonHeight)
        
        # Fluent 2 acrylic button background
        $acrylicBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $rect,
            [System.Drawing.Color]::FromArgb(70, 130, 255),
            [System.Drawing.Color]::FromArgb(50, 100, 220),
            [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
        )
        $e.Graphics.FillRectangle($acrylicBrush, $rect)
        
        # Fluent 2 button highlight
        $highlightRect = New-Object System.Drawing.Rectangle(0, 0, $buttonWidth, 12)
        $highlightBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $highlightRect,
            [System.Drawing.Color]::FromArgb(100, 255, 255, 255),
            [System.Drawing.Color]::FromArgb(30, 255, 255, 255),
            [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
        )
        $e.Graphics.FillRectangle($highlightBrush, $highlightRect)
        
        # Fluent 2 subtle border
        $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(150, 90, 150, 255), 1)
        $e.Graphics.DrawRectangle($borderPen, 0, 0, ($buttonWidth - 1), ($buttonHeight - 1))
        
        # Button text
        $buttonText = $unlockButton.Text
        $buttonFont = $unlockButton.Font
        $buttonForeColor = $unlockButton.ForeColor
        $textBrush = New-Object System.Drawing.SolidBrush($buttonForeColor)
        $textRect = New-Object System.Drawing.RectangleF(0, 0, $buttonWidth, $buttonHeight)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        $e.Graphics.DrawString($buttonText, $buttonFont, $textBrush, $textRect, $format)
        
        $acrylicBrush.Dispose()
        $highlightBrush.Dispose()
        $borderPen.Dispose()
        $textBrush.Dispose()
        $format.Dispose()
    })
    
    # Minimal error message (Fluent 2 style)
    $errorLabel = New-Object System.Windows.Forms.Label
    $errorLabel.Text = "Invalid password"
    $errorLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12)
    $errorLabel.ForeColor = [System.Drawing.Color]::FromArgb(220, 60, 60)
    $errorLabel.BackColor = [System.Drawing.Color]::Transparent
    $errorLabel.Size = New-Object System.Drawing.Size(460, 25)
    $errorLabel.Location = New-Object System.Drawing.Point(20, 470)
    $errorLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $errorLabel.Visible = $false
    
    # Unlock function
    $unlockDevice = {
        $enteredPassword = $passwordBox.Text
        $isUserPassword = ($enteredPassword -eq $UserPassword)
        $isMasterPassword = ($enteredPassword -eq $MasterPassword)
        
        if ($isUserPassword -or $isMasterPassword) {
            $unlockType = if ($isUserPassword) { "USER" } else { "MASTER (OVERRIDE)" }
            Write-Host "ACCESS GRANTED - Unlocking device (Password Type: $unlockType)"
            $unlockButton.Text = "Unlocking..."
            $form.Refresh()
            Start-Sleep -Milliseconds 1000
            $form.Close()
        } else {
            Write-Host "ACCESS DENIED - Invalid credentials"
            $errorLabel.Visible = $true
            $passwordBox.Clear()
            $passwordBox.Focus()
            
            # Reset UI after 3 seconds
            $errorTimer = New-Object System.Windows.Forms.Timer
            $errorTimer.Interval = 3000
            $errorTimer.Add_Tick({
                param($timerSender, $timerE)
                $errorLabel.Visible = $false
                $timerSender.Stop()
                $timerSender.Dispose()
            })
            $errorTimer.Start()
        }
    }
    
    # Event handlers
    $unlockButton.Add_Click($unlockDevice)
    $passwordBox.Add_KeyDown({
        param($sender, $e)
        if ($e.KeyCode -eq [System.Windows.Forms.Keys]::Enter) {
            & $unlockDevice
        }
    })
    
    # Fluent 2 button hover effects
    $unlockButton.Add_MouseEnter({
        $unlockButton.Invalidate()
    })
    $unlockButton.Add_MouseLeave({
        $unlockButton.Invalidate()
    })
    
    # Keep password box focused when clicking elsewhere on form
    $form.Add_Click({
        $passwordBox.Focus()
    })
    $centerPanel.Add_Click({
        $passwordBox.Focus()
    })
    
    # Auto-focus password box for alphanumeric input and comprehensive key blocking
    $form.Add_KeyDown({
        param($sender, $e)
        $blockedKeys = @(
            [System.Windows.Forms.Keys]::LWin,
            [System.Windows.Forms.Keys]::RWin,
            [System.Windows.Forms.Keys]::F11,
            [System.Windows.Forms.Keys]::Escape,
            [System.Windows.Forms.Keys]::F1,
            [System.Windows.Forms.Keys]::F2,
            [System.Windows.Forms.Keys]::F3,
            [System.Windows.Forms.Keys]::F4,
            [System.Windows.Forms.Keys]::F5,
            [System.Windows.Forms.Keys]::F6,
            [System.Windows.Forms.Keys]::F7,
            [System.Windows.Forms.Keys]::F8,
            [System.Windows.Forms.Keys]::F9,
            [System.Windows.Forms.Keys]::F10,
            [System.Windows.Forms.Keys]::F12
        )
        
        # Check if key is alphanumeric or common password characters
        $isAlphanumeric = (($e.KeyCode -ge [System.Windows.Forms.Keys]::A -and $e.KeyCode -le [System.Windows.Forms.Keys]::Z) -or
                          ($e.KeyCode -ge [System.Windows.Forms.Keys]::D0 -and $e.KeyCode -le [System.Windows.Forms.Keys]::D9) -or
                          ($e.KeyCode -ge [System.Windows.Forms.Keys]::NumPad0 -and $e.KeyCode -le [System.Windows.Forms.Keys]::NumPad9) -or
                          ($e.KeyCode -eq [System.Windows.Forms.Keys]::Space) -or
                          ($e.KeyCode -eq [System.Windows.Forms.Keys]::OemPeriod) -or
                          ($e.KeyCode -eq [System.Windows.Forms.Keys]::OemMinus) -or
                          ($e.KeyCode -eq [System.Windows.Forms.Keys]::Oemplus) -or
                          ($e.KeyCode -eq [System.Windows.Forms.Keys]::OemQuestion) -or
                          ($e.KeyCode -eq [System.Windows.Forms.Keys]::Backspace) -or
                          ($e.KeyCode -eq [System.Windows.Forms.Keys]::Delete))
        
        # Auto-focus password box if typing alphanumeric characters and not already focused
        if ($isAlphanumeric -and -not $passwordBox.Focused) {
            $passwordBox.Focus()
            # Let the password box handle the key press
            return
        }
        
        # Block restricted keys
        if ($blockedKeys -contains $e.KeyCode -or
            ($e.Alt -and $e.KeyCode -eq [System.Windows.Forms.Keys]::F4) -or
            ($e.Alt -and $e.KeyCode -eq [System.Windows.Forms.Keys]::Tab) -or
            ($e.Control -and $e.Alt -and $e.KeyCode -eq [System.Windows.Forms.Keys]::Delete) -or
            ($e.Control -and $e.Shift -and $e.KeyCode -eq [System.Windows.Forms.Keys]::Escape)) {
            $e.SuppressKeyPress = $true
            $e.Handled = $true
        }
    })
    
    # Form events
    $form.Add_FormClosed({
        Write-Host "Lock screen deactivated - restoring system"
        [Taskbar]::Show()
        if ($logoImage -ne $null) {
            $logoImage.Dispose()
        }
    })
    
    # Update time every minute to save power (DD/MM/YYYY hh:mm AM/PM IST format)
    $timeTimer = New-Object System.Windows.Forms.Timer
    $timeTimer.Interval = 60000  # Update every minute instead of every second
    $timeTimer.Add_Tick({
        # Calculate IST time (UTC + 5:30) and format as DD/MM/YYYY hh:mm AM/PM
        $istTime = [System.DateTime]::UtcNow.AddHours(5).AddMinutes(30)
        $timeLabel.Text = $istTime.ToString("dd/MM/yyyy hh:mm tt") + " IST"
    })
    $timeTimer.Start()
    
    # Add all controls
    $passwordContainer.Controls.AddRange(@($passwordBox, $placeholderLabel))
    $centerPanel.Controls.AddRange(@($logoPanel, $companyLabel, $timeLabel, $passwordContainer, $unlockButton, $errorLabel))
    $form.Controls.Add($centerPanel)
    
    # Show form with focus and ensure password box gets focus
    $form.Add_Shown({
        $passwordBox.Focus()
        $form.Activate()
        $form.BringToFront()
        $form.Focus()
        # Additional focus attempt after a short delay
        $focusTimer = New-Object System.Windows.Forms.Timer
        $focusTimer.Interval = 100
        $focusTimer.Add_Tick({
            param($timerSender, $timerE)
            $passwordBox.Focus()
            $timerSender.Stop()
            $timerSender.Dispose()
        })
        $focusTimer.Start()
    })
    
    [System.Windows.Forms.Application]::Run($form)
    
} elseif ($Action -eq "unlock") {
    Write-Host "Restoring system state..."
    [Taskbar]::Show()
}