import { copyFile } from 'copy-file-util'

(() => {
  const icon = copyFile.cp('./src/vite.svg', { targetFolder: './dist', overwrite: true })
  const html = copyFile.cp('./src/dev-server-index.html', { targetFolder: './dist', overwrite: true })
  copyFile.reporter(icon)
  copyFile.reporter(html)
})()
