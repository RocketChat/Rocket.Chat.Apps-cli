export const gitIgnoreTemplate = (): string => {
    return `# ignore modules pulled in from npm
node_modules/

# rc-apps package output
dist/

# JetBrains IDEs
out/
.idea/
.idea_modules/

# macOS
.DS_Store
.AppleDouble
.LSOverride
._*
.DocumentRevisions-V100
.fseventsd
.Spotlight-V100
.TemporaryItems
.Trashes
.VolumeIcon.icns
.com.apple.timemachine.donotpresent
.AppleDB
.AppleDesktop
Network Trash Folder
Temporary Items
.apdisk
`;
};
