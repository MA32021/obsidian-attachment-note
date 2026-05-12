# Obsidian Attachment Note Plugin

Create markdown notes for binary files with MD5 hash tracking and automatic link updating.

## Features

- 📎 Process any binary file (PDF, images, documents, etc.)
- 🔒 Rename files to MD5 hash format for unique identification and deduplication
- 📝 Create markdown notes with YAML frontmatter containing metadata
- 🔗 Automatically updates ALL existing links throughout your vault when renaming
- 📁 Optional output folder for organized storage
- 🖱️ Multiple processing methods (auto, right-click, command palette)
- 🎨 Fully customizable note templates
- 🔄 Recursive subfolder scanning
- ⚡ Auto-processing with intelligent duplicate detection
- ✏️ Optional prompt for note name before creation
- 🚫 Automatically skips already processed files (MD5-named files)

## Installation

### From Obsidian Community Plugins

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

## Configuration

### Input Folder
- **Description**: Folder to watch for binary files (leave empty for vault root)
- **Default**: `Attachments`
- **Example**: `Inbox`, `Downloads`, `Scanned Documents`

### Scan Subfolders Recursively
- **Description**: Also process binary files in subfolders of the input folder
- **Default**: `false` (disabled)
- **When enabled**: All subfolders within the input folder will be scanned for files
- **When disabled**: Only files directly in the input folder are processed

### Output Folder
- **Description**: Folder to move renamed files and notes to (leave empty to keep in source folder)
- **Default**: `(empty)`
- **Example**: `Processed Files`, `Attachments/Organized`
- **Note**: All existing links to the file will be automatically updated when moved

### Auto-process Files
- **Description**: Automatically process files when they are added to the input folder
- **Default**: `true` (enabled)
- **Note**: Respects recursive scan setting for subfolder monitoring

### Prompt for Note Name
- **Description**: Show a dialog to edit the note name before creation
- **Default**: `false` (disabled)
- **When enabled**: A popup dialog appears asking for the note name (pre-filled with original filename)
- **When disabled**: Note is automatically named using the original filename

### Note Template
- **Description**: Template for the note content
- **Default**: See template below
- **Available variables**:
  - `{{filename}}` - The note name (editable if prompt is enabled)
  - `{{originalName}}` - Original filename without extension
  - `{{hash}}` - MD5 hash of the file (unique identifier)
  - `{{extension}}` - File extension (e.g., pdf, jpg, docx)
  - `{{size}}` - Human-readable file size (e.g., 2.5 MB)
  - `{{date}}` - Current date and time when note is created

#### Default Template

```markdown
# {{filename}}

## File Information

- **Original name:** {{originalName}}
- **MD5 Hash:** {{hash}}
- **File size:** {{size}}
- **File type:** {{extension}}
- **Created:** {{date}}

## Description

Add your notes here.

## Linked File

[[{{hash}}.{{extension}}]]

```

## Usage

### Processing Methods

#### Method 1: Auto-Processing
Configure the Input folder setting
Enable Auto-process files
Place any binary file in the input folder

The plugin automatically:
- Renames the file to <MD5_HASH>.<ext>
- Creates a markdown note with metadata
- Updates all existing links to the file
- Shows a completion notice

#### Method 2: Right-Click Context Menu
Right-click on any binary file in your vault
Select "Create attachment note"
The file is processed immediately
Note: This works regardless of the input folder setting

#### Method 3: Command Palette
Process all files in input folder: Processes all unprocessed files in the configured input folder (respects recursive setting)
Create attachment note for current file: Processes the currently open file

### What Happens When You Process a File

1. File Renaming:
- Original file is renamed to <MD5_HASH>.<extension>
- Example: document.pdf → a1b2c3d4e5f678901234567890123456.pdf
- All links to the file are automatically updated throughout your vault

2. Note Creation:
- A markdown note is created with the original filename (or custom name if prompted)
- Note contains YAML frontmatter with metadata
- Note links to the renamed file
- Note location follows the output folder setting

3. Link Update:
- Obsidian's file manager updates every link to the renamed file
- Preserves link text and formatting
- Works with wikilinks, embeds, and transclusions

### YAML Frontmatter

Each created note includes the following frontmatter:

```yaml
---
hash: a1b2c3d4e5f678901234567890123456
originalName: document
fileType: pdf
fileSize: 2.5 MB
processed: 2024-01-15T10:30:00.000Z
---
```
This allows for:
- Dataview queries to find files by hash
- Easy reference to original filenames
- Tracking when files were processed

### File Structure Examples

#### Without Output Folder (files stay in source)

```text
Vault/
├── Attachments/              # Input folder
│   ├── document.pdf         # Original file
│   ├── image.jpg
│   ├── a1b2c3d4.pdf        # Renamed file (MD5 hash)
│   ├── e5f6g7h8.jpg
│   ├── document.md          # Associated note
│   └── image.md
└── .obsidian/plugins/obsidian-att-note/
```

#### With Output Folder

```text
Vault/
├── Attachments/              # Input folder
│   ├── document.pdf         # Original file
│   └── image.jpg
├── Processed/               # Output folder
│   ├── a1b2c3d4.pdf        # Renamed file
│   ├── e5f6g7h8.jpg
│   ├── document.md          # Associated note
│   └── image.md
└── .obsidian/plugins/obsidian-att-note/
```

#### With Recursive Subfolder Scanning

```text
Vault/
├── Attachments/              # Input folder
│   ├── Projects/
│   │   ├── report.pdf       # Processed
│   │   └── proposal.docx    # Processed
│   ├── Personal/
│   │   └── photo.jpg        # Processed
│   └── document.pdf         # Processed
└── Processed/               # Output folder (all files moved here)
    ├── a1b2c3d4.pdf
    ├── e5f6g7h8.docx
    ├── i9j0k1l2.jpg
    ├── report.md
    ├── proposal.md
    └── photo.md
```

### Smart Features

#### Duplicate Detection

Files already named as MD5 hash (32 hex characters) are automatically skipped
Prevents re-processing of previously converted files
Clear console logging of skipped files

#### Conflict Resolution

If a file with the same MD5 hash already exists, processing is skipped
Unique note names are ensured with counter suffixes (document_1.md, document_2.md)

#### Link Preservation

All links to processed files are automatically updated
No broken links in your vault
Works across all notes and folders

### Dataview Queries Examples

You can use the YAML frontmatter with Dataview to query your attachment notes:

```dataview
TABLE originalName, fileType, fileSize, processed
WHERE hash != null
SORT processed DESC
```

## Use Cases

1. Digital Asset Management: Rename files to unique identifiers while keeping original names in metadata
2. Duplicate Detection: MD5 hashes ensure identical files are detected
3. Organized Storage: Automatically move processed files to organized folders
4. Link Management: Update links automatically when files are renamed or moved
5. Batch Processing: Process entire folders with recursive scanning

## Commands

Command	Description
Process all files in input folder	Processes all unprocessed binary files in the configured input folder
Create attachment note for current file	Processes the currently open file

## Smart File Detection

The plugin automatically:
- Skips markdown (.md) files - Only processes binary files
- Skips MD5-named files - Files already in hash format won't be reprocessed
- Skips existing files - Prevents overwriting when target file already exists

## Troubleshooting

### Files aren't auto-processing
Check that Auto-process files is enabled
Verify Input folder setting is correct
Ensure files are placed directly in the input folder (unless recursive scanning is enabled)
Check console for error messages (Ctrl/Cmd+Shift+I)

### Links are broken after processing
The plugin uses Obsidian's fileManager.renameFile() which should update all links
Check console for any error messages
Try restarting Obsidian

### Duplicate notes created
Enable Prompt for note name to manually choose names
The plugin automatically adds counters to duplicate note names

## Development

```bash
# Clone the repository
git clone https://github.com/MA32021/obsidian-attachment-note

# Install dependencies Install dependencies
cd obsidian-attachment-note
npm install

# Build for development (watch mode)
npm run dev

## Build for production
npm run build
```


## Support

- Report issues issues on https://github.com/MA32021/obsidian-attachment-note/issues
- Feature requests welcome
- Contributions welcome


## License

MIT

## Changelog

### Version Version 1.0.0

- Initial release
- File processing with MD hash renaming
- Automatic note creation with customizable templates
- YAML frontmatter with metadata
- Auto-processing with folder watching
- Right-click context menu support
- Recursive subfolder scanning
- Automatic link updating
- Duplicate detection and skip logic
- Customizable output folder
- Optional note name prompt
- Status bar indicator



