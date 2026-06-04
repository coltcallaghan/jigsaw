/**
 * electron-builder afterPack hook.
 *
 * Strips macOS extended attributes (com.apple.FinderInfo / resource forks) from
 * the packaged .app *before* electron-builder code-signs it. These xattrs ride
 * along on the downloaded Electron binary (and can be re-stamped by file
 * providers / iCloud-managed paths), and `codesign` refuses to sign any file
 * carrying them ("resource fork, Finder information, or similar detritus not
 * allowed"), which otherwise fails the macOS build.
 *
 * No-op on non-macOS targets.
 */
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const execFileP = promisify(execFile)

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = `${context.appOutDir}/${appName}`

  // `xattr -rc` clears every xattr recursively, including on bundle directories.
  // Run twice: some directory-level FinderInfo only clears on a second pass.
  for (let i = 0; i < 2; i++) {
    try {
      await execFileP('xattr', ['-rc', appPath])
    } catch {
      // best-effort; codesign will surface anything genuinely left
    }
  }
  // eslint-disable-next-line no-console
  console.log(`  • afterPack: stripped extended attributes from ${appName}`)
}
