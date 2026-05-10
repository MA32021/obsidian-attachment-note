# Obsidian Attachment Note Plugin

Create markdown notes for binary files with MD5 hash tracking.

## Features

- 📎 Process binary files (any type)
- 🔒 Rename files to MD5 hash format for unique identification
- 📝 Create markdown notes with YAML frontmatter containing the hash
- 🎨 Customizable note templates
- 📁 Auto-process files in specified input folder
- 🖱️ Right-click context menu for individual file processing
- 📂 Optional output folder organization
- ✏️ Optional prompt for note name

## Installation

### From Obsidian Community Plugins (once published)

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Attachment Note"
4. Install the plugin
5. Enable the plugin

### Manual Installation

1. Download the latest release from GitHub
2. Extract the files to `<vault>/.obsidian/plugins/obsidian-att-note/`
3. Reload Obsidian
4. Enable the plugin in Community Plugins settings

## Usage

### Setup

1. Create an input folder (e.g., "Attachments")
2. Configure the plugin settings:
   - **Input folder**: Where to watch for files
   - **Output folder**: Where to move processed files (optional)
   - **Auto-process**: Automatically process new files
   - **Prompt for name**: Ask for note name before creation
   - **Note template**: Customize the note content

### Processing Files

**Option 1: Auto-processing**
- Place files in the input folder
- They will be automatically processed

**Option 2: Right-click**
- Right-click any file in the vault
- Select "Create attachment note"

**Option 3: Command Palette**
- Run "Process all files in input folder"
- Run "Create attachment note for current file"

### What Happens

1. The original file is renamed to `<MD5_HASH>.<ext>` (unique)
2. A markdown note is created with:
   - YAML frontmatter containing the hash
   - Link to the renamed file
   - File information (size, type, original name)
3. Files can be moved to an output folder (optional)

## Template Variables

Use these variables in your note template:

| Variable | Description |
|----------|-------------|
| `{{filename}}` | The note name (original file name) |
| `{{originalName}}` | Original file name without extension |
| `{{hash}}` | MD5 hash of the file |
| `{{extension}}` | File extension |
| `{{size}}` | Human-readable file size |
| `{{date}}` | Current date and time |

## Configuration

### Input Folder
The folder where binary files are placed for auto-processing. Leave empty to watch the vault root.

### Output Folder
Where renamed files and their notes will be moved. Leave empty to keep in the same folder as the original.

### Auto-process
When enabled, any file placed in the input folder will be automatically processed.

### Prompt for Note Name
When enabled, shows a dialog to edit the note name before creation.

### Note Template
Customize the content of created notes. You can use HTML and markdown formatting.

## File Structure Example
