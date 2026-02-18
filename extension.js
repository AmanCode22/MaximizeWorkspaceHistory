import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';

export default class MaximizeWorkspaceHistory extends Extension {
    constructor(args) {
        super(args);
        this._oldWorkspaces = {};
        this._fullScreenApps = {};
        this._timeoutIds = []; // Track timeouts to prevent ghost processes
    }

    // GNOME 49 compatibility helper
    _isWindowMaximized(win) {
        // GNOME 49 completely removed get_maximized() in favor of is_maximized()
        if (typeof win.is_maximized === 'function') {
            return win.is_maximized();
        }
        // Fallback for GNOME 48 and older
        if (typeof win.get_maximized === 'function') {
            return win.get_maximized() === Meta.MaximizeFlags.BOTH;
        }
        return false;
    }

    enable() {
        // Bind all window manager signals directly to this extension object
        global.window_manager.connectObject(
            'map', (_, act, change) => {
                if (act.meta_window && this._isWindowMaximized(act.meta_window)) {
                    this._check(act.meta_window, change);
                }
            },
            'size-change', (_, act, change) => {
                let timeoutId = GLib.timeout_add(GLib.PRIORITY_LOW, 300, () => {
                    if (act.meta_window) {
                        this._check(act.meta_window, change);
                    }
                    // Clean up timeout ID tracking once done
                    this._timeoutIds = this._timeoutIds.filter(id => id !== timeoutId);
                    return GLib.SOURCE_REMOVE; 
                });
                this._timeoutIds.push(timeoutId);
            },
            'destroy', (_, act) => {
                this._handleWindowClose(act);
            },
            this // The target object tying the lifecycle of these signals
        );
    }

    disable() {
        // Automatically disconnects all signals tied to 'this' in connectObject
        global.window_manager.disconnectObject(this);
        
        // Kill any pending GLib timeouts so they don't fire after disabling
        for (const timeoutId of this._timeoutIds) {
            GLib.source_remove(timeoutId);
        }
        
        // Reset state
        this._timeoutIds = [];
        this._oldWorkspaces = {};
        this._fullScreenApps = {};
    }

    _changeWorkspace(win, manager, index) {
        const n = manager.get_n_workspaces();
        if (n <= index) {
            return;
        }
        
        const targetWorkspace = manager.get_workspace_by_index(index);
        if (targetWorkspace) {
            win.change_workspace(targetWorkspace);
            targetWorkspace.activate(global.get_current_time());
        }
    }

    _firstEmptyWorkspaceIndex(manager, win) {
        const n = manager.get_n_workspaces();
        let lastworkspace = n - 1;
        
        for (let i = 0; i < lastworkspace; ++i) {
            const workspace = manager.get_workspace_by_index(i);
            if (!workspace) continue;
            
            let win_count = workspace.list_windows()
                .filter(w => !w.is_always_on_all_workspaces() && win.get_monitor() === w.get_monitor()).length;
                
            if (win_count < 1) {
                return i;
            }
        }
        
        if (lastworkspace < 1) lastworkspace = 1;
        return lastworkspace;
    }

    _check(win, change) {
        if (!win || win.window_type !== Meta.WindowType.NORMAL) {
            return;
        }
        
        const display = win.get_display();
        if (!display) return;
        
        const workspacemanager = display.get_workspace_manager();
        const name = win.get_id();
        const currentWorkspace = win.get_workspace();
        
        if (!currentWorkspace) return;

        const w = currentWorkspace.list_windows()
            .filter(w => w !== win && !w.is_always_on_all_workspaces() && win.get_monitor() === w.get_monitor());

        if (change === Meta.SizeChange.UNFULLSCREEN || change === Meta.SizeChange.UNMAXIMIZE || (change === Meta.SizeChange.MAXIMIZE && !this._isWindowMaximized(win))) {
            
            if (this._fullScreenApps[name] !== undefined) {
                if (w.length === 0) {
                    this._changeWorkspace(win, workspacemanager, this._fullScreenApps[name]);
                }
                delete this._fullScreenApps[name];
                return;
            }
            
            if (this._oldWorkspaces[name] !== undefined) {
                if (w.length === 0) { 
                    this._changeWorkspace(win, workspacemanager, this._oldWorkspaces[name]);
                }
                delete this._oldWorkspaces[name];
            }
            return;
        }

        if (change === Meta.SizeChange.FULLSCREEN) {
            this._fullScreenApps[name] = currentWorkspace.index();
        } else {
            this._oldWorkspaces[name] = currentWorkspace.index();
        }

        if (w.length >= 1) {
            let emptyworkspace = this._firstEmptyWorkspaceIndex(workspacemanager, win);
            if (emptyworkspace === currentWorkspace.index()) return;
            this._changeWorkspace(win, workspacemanager, emptyworkspace);
        }
    }

    _handleWindowClose(act) {
        if (!act.meta_window) return;
        
        let win = act.meta_window;
        let name = win.get_id();
        
        if (this._oldWorkspaces[name] !== undefined) {
            const display = win.get_display();
            if (display) {
                const targetWorkspace = display.get_workspace_manager().get_workspace_by_index(this._oldWorkspaces[name]);
                if (targetWorkspace) {
                    targetWorkspace.activate(global.get_current_time());
                }
            }
            delete this._oldWorkspaces[name];
        }
        
        if (this._fullScreenApps[name] !== undefined) {
            delete this._fullScreenApps[name];
        }
    }
}
