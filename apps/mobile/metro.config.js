// Lets Metro bundle the shared TypeScript package from ../../packages/shared.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')
const config = getDefaultConfig(projectRoot)

config.watchFolders = [path.join(workspaceRoot, 'packages/shared')]
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules')]

module.exports = config
