/**
 * Prompt the user to choose an image and return it as a data URL, or null if
 * they cancel / pick a non-image. Uses the Electron native dialog when available
 * (desktop), otherwise a hidden file input (web/mobile).
 */
export function pickImage(): Promise<string | null> {
  const api = (window as unknown as { electronAPI?: { openImage?: () => Promise<string | null> } }).electronAPI
  if (api?.openImage) {
    return api.openImage()
  }
  return pickViaFileInput()
}

function pickViaFileInput(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      input.remove()
      resolve(value)
    }
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file || !file.type.startsWith('image/')) return finish(null)
      const reader = new FileReader()
      reader.onload = e => finish(e.target?.result as string)
      reader.onerror = () => finish(null)
      reader.readAsDataURL(file)
    }
    // If the dialog is dismissed without a selection, resolve null on refocus.
    window.addEventListener('focus', () => setTimeout(() => finish(null), 300), { once: true })
    document.body.appendChild(input)
    input.click()
  })
}
