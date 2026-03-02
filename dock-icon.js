const path = require('path');
const { nativeImage } = require('electron');

function setSquircleDockIcon(app, baseDir) {
    if (!app.dock) return;
    try {
        const iconPath = path.join(baseDir, 'assets', 'dock-icon.png');
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
            app.dock.setIcon(icon);
        }
    } catch (err) {
        console.error('Failed to set dock icon:', err.message);
    }
}

module.exports = { setSquircleDockIcon };
