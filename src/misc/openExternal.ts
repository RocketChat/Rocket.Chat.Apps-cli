import {spawn} from 'child_process'

const getOpenCommand = (url: string): {command: string; args: Array<string>} => {
  if (process.platform === 'darwin') {
    return {command: 'open', args: [url]}
  }

  if (process.platform === 'win32') {
    return {command: 'cmd', args: ['/c', 'start', '""', url]}
  }

  return {command: 'xdg-open', args: [url]}
}

export const openExternal = async (url: string): Promise<void> => {
  const {command, args} = getOpenCommand(url)

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {detached: true, stdio: 'ignore'})
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}
