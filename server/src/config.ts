import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

export interface AppConfig {
  host: string
  port: number
  devPort: number
  adminPassword: string
  mediaPath: string
  uploadFileSizeMax: number
}

const DEFAULT_CONFIG: AppConfig = {
  host: '0.0.0.0',
  port: 3303,
  devPort: 3300,
  adminPassword: '202cb962ac59075b964b07152d234b70',
  mediaPath: './media',
  uploadFileSizeMax: 15,
}

function resolveMediaPath(mediaPath: string, configDir: string): string {
  if (path.isAbsolute(mediaPath)) return mediaPath
  return path.resolve(configDir, mediaPath)
}

function loadConfig(): AppConfig {
  const configPath = path.resolve(__dirname, '../../config.yml')
  if (!fs.existsSync(configPath)) return DEFAULT_CONFIG

  const raw = yaml.load(fs.readFileSync(configPath, 'utf-8')) as Partial<AppConfig>
  const merged: AppConfig = { ...DEFAULT_CONFIG, ...raw }
  merged.mediaPath = resolveMediaPath(merged.mediaPath, path.dirname(configPath))
  return merged
}

export const config = loadConfig()
