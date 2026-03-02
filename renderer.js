document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const toggleBtn = document.getElementById('toggle');
    const autoAcceptEl = document.getElementById('auto-accept-status');

    let enabled = true;

    toggleBtn.addEventListener('click', () => {
        enabled = !enabled;
        toggleBtn.textContent = enabled ? 'Disable Auto-accept' : 'Enable Auto-accept';
        toggleBtn.className = enabled ? 'enabled' : 'disabled';
        autoAcceptEl.textContent = enabled ? 'Auto Accept: Enabled' : 'Auto Accept: Disabled';
        autoAcceptEl.className = enabled ? 'enabled' : 'disabled';
        window.electronAPI.toggleAutoAccept(enabled);
    });

    window.electronAPI.onStatusUpdate((status) => {
        statusEl.textContent = 'Status: ' + status;
        if (status.includes('Connected')) {
            statusEl.classList.add('connected');
        } else {
            statusEl.classList.remove('connected');
        }
    });
});
