# MaximizeWorkspaceHistory

A modernized fork that brings the macOS experience to GNOME: it puts windows in a new workspace when maximized or full-screened and brings you back to the original workspace when unmaximized, unfull-screened, or the window gets closed. 

For the best experience, set up 3/4 finger gestures to tile windows and switch workspaces.

***

Reference: 
Fork of `raonetwo/MaximizeToWorkspace` updated to support the GNOME 45+ ESM architecture. Original history logic inspired by `rliang` and `satran`.

***

### Manual Installation (GNOME 45+)

To install this extension locally:

```bash
git clone https://github.com/AmanCode22/MaximizeWorkspaceHistory.git
cd MaximizeWorkspaceHistory
gnome-extensions pack --force
gnome-extensions install maximize-workspace-history@amancode22.github.com.shell-extension.zip --force
```
#### Important Note:
After installation on x11 press Alt + F2 and entering r to restart the GNOME shell for extension to work properly. For wayland you will need to log out of your session completely and login for the extension to work properly.
After restarting shell/re-login enable extension and enjoy!

### Install from gnome extensions website (Gnome 45+)
https://extensions.gnome.org/extension/9346/maximize-to-workspace-with-history/
