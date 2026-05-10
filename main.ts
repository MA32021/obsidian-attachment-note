import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, Notice, Modal } from 'obsidian';
import * as crypto from 'crypto';

interface AttachmentNoteSettings {
    inputFolder: string;           // Folder to watch for binary files
    outputFolder: string;          // Folder to move renamed files and notes to (empty = stay in source)
    autoProcess: boolean;          // Auto-process files in input folder
    promptForName: boolean;        // Prompt user for note name
    recursiveScan: boolean;        // Scan subfolders of input folder recursively
    noteTemplate: string;          // Custom note template
}

const DEFAULT_SETTINGS: AttachmentNoteSettings = {
    inputFolder: 'Attachments',
    outputFolder: '',
    autoProcess: true,
    promptForName: false,
    recursiveScan: false,
    noteTemplate: `# {{filename}}

## File Information

- **Original name:** {{originalName}}
- **MD5 Hash:** {{hash}}
- **File size:** {{size}}
- **File type:** {{extension}}
- **Created:** {{date}}

## Description

Add your notes here.

## Linked File

[[{{hash}}.{{extension}}]]`
};

export default class AttachmentNotePlugin extends Plugin {
    settings: AttachmentNoteSettings;
    private isProcessing = false; // Prevent recursive processing

    async onload() {
        await this.loadSettings();

        // Add command to process all files in input folder
        this.addCommand({
            id: 'process-all-attachments',
            name: 'Process all files in input folder',
            callback: () => this.processAllFiles()
        });

        // Add command to process current file (via file menu)
        this.addCommand({
            id: 'process-current-attachment',
            name: 'Create attachment note for current file',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile && activeFile.extension !== 'md') {
                    if (!checking) {
                        this.processSingleFile(activeFile);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add file menu item for right-click context menu
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile && file.extension !== 'md') {
                    menu.addItem((item) => {
                        item
                            .setTitle('Create attachment note')
                            .setIcon('document')
                            .onClick(() => this.processSingleFile(file));
                    });
                }
            })
        );

        // Add settings tab
        this.addSettingTab(new AttachmentNoteSettingTab(this.app, this));

        // Watch for new files in input folder (including subfolders if recursive)
        if (this.settings.autoProcess) {
            this.registerEvent(
                this.app.vault.on('create', (file) => {
                    // Skip if already processing to prevent recursion
                    if (this.isProcessing) return;
                    
                    // Only process binary files, not markdown files
                    if (file instanceof TFile && file.extension !== 'md') {
                        this.checkAndProcessFile(file);
                    }
                })
            );
        }

        // Add status bar item
        const statusBarItem = this.addStatusBarItem();
        statusBarItem.createEl('span', {
            text: '📎 AttNote',
            attr: { style: 'margin-right: 10px; opacity: 0.7;' }
        });

        console.log('Attachment Note Plugin loaded');
    }

    onunload() {
        console.log('Attachment Note Plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Check if a file is already processed (named as MD5 hash)
     */
    isFileAlreadyProcessed(file: TFile): boolean {
        // Check if filename matches MD5 hash pattern (32 hex characters) followed by extension
        const fileName = file.basename;
        const md5Pattern = /^[a-f0-9]{32}$/i;
        return md5Pattern.test(fileName);
    }

    /**
     * Check if a file should be processed based on input folder settings
     */
    async checkAndProcessFile(file: TFile) {
        // Skip markdown files
        if (file.extension === 'md') return;

        // Skip already processed files (already in MD5 format)
        if (this.isFileAlreadyProcessed(file)) {
            console.log(`Skipping already processed file: ${file.path} (already in MD5 format)`);
            return;
        }

        const inputFolderPath = this.settings.inputFolder;
        const filePath = file.path;

        // Handle empty input folder (root)
        if (!inputFolderPath || inputFolderPath === '') {
            // File is in root if it doesn't contain '/'
            if (!filePath.includes('/')) {
                await this.processSingleFile(file);
            }
            return;
        }

        // Check if file is within the input folder
        const isInInputFolder = filePath.startsWith(inputFolderPath + '/') || 
                                filePath === inputFolderPath;
        
        if (!isInInputFolder) return;
        
        // If recursive scan is enabled, process all files in input folder and subfolders
        if (this.settings.recursiveScan) {
            await this.processSingleFile(file);
            return;
        }
        
        // If not recursive, only process files directly in the input folder (not in subfolders)
        const parentPath = file.parent ? file.parent.path : '';
        if (parentPath === inputFolderPath) {
            await this.processSingleFile(file);
        }
    }

    /**
     * Get all binary files from a folder (with optional recursion)
     */
    async getAllFilesFromFolder(folder: TFolder): Promise<TFile[]> {
        const files: TFile[] = [];
        
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension !== 'md') {
                // Skip already processed files
                if (!this.isFileAlreadyProcessed(child)) {
                    files.push(child);
                } else {
                    console.log(`Skipping already processed file: ${child.path} (already in MD5 format)`);
                }
            } else if (child instanceof TFolder && this.settings.recursiveScan) {
                const subFiles = await this.getAllFilesFromFolder(child);
                files.push(...subFiles);
            }
        }
        
        return files;
    }

    /**
     * Process all files in the input folder
     */
    async processAllFiles() {
        if (this.isProcessing) {
            new Notice('Already processing files. Please wait...');
            return;
        }
        
        this.isProcessing = true;
        
        try {
            const inputFolderPath = this.settings.inputFolder;
            
            if (!inputFolderPath || inputFolderPath === '') {
                // Process all files in root (skip .md files and already processed)
                const rootFiles = this.app.vault.getRoot().children;
                const files = rootFiles.filter(f => 
                    f instanceof TFile && 
                    f.extension !== 'md' && 
                    !this.isFileAlreadyProcessed(f as TFile)
                ) as TFile[];
                
                if (files.length === 0) {
                    new Notice('No binary files found in root folder.');
                    return;
                }

                new Notice(`Processing ${files.length} file(s)...`);
                
                for (const file of files) {
                    await this.processSingleFile(file);
                }
                
                new Notice(`Processed ${files.length} file(s).`);
            } else {
                // Get the input folder
                const inputFolder = this.app.vault.getAbstractFileByPath(inputFolderPath);
                
                if (!inputFolder || !(inputFolder instanceof TFolder)) {
                    new Notice(`Input folder "${inputFolderPath}" does not exist.`);
                    return;
                }

                // Get files based on recursive setting (already filtered for already processed)
                const files = await this.getAllFilesFromFolder(inputFolder);
                
                if (files.length === 0) {
                    new Notice('No unprocessed binary files found in input folder.');
                    return;
                }

                new Notice(`Processing ${files.length} file(s)...`);
                
                for (const file of files) {
                    await this.processSingleFile(file);
                }
                
                new Notice(`Processed ${files.length} file(s).`);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Convert ArrayBuffer to Buffer for crypto operations
     */
    arrayBufferToBuffer(arrayBuffer: ArrayBuffer): Buffer {
        return Buffer.from(arrayBuffer);
    }

    /**
     * Process a single binary file with proper link updating
     */
    async processSingleFile(originalFile: TFile) {
        // Skip markdown files
        if (originalFile.extension === 'md') {
            console.log('Skipping markdown file:', originalFile.name);
            return;
        }

        // Skip already processed files
        if (this.isFileAlreadyProcessed(originalFile)) {
            console.log(`Skipping already processed file: ${originalFile.path} (already in MD5 format)`);
            new Notice(`Skipping already processed file: ${originalFile.name}`);
            return;
        }

        // Prevent recursive processing
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        try {
            console.log('Processing file:', originalFile.path);
            
            // Read file content as ArrayBuffer
            const content = await this.app.vault.readBinary(originalFile);
            
            // Convert ArrayBuffer to Buffer for crypto
            const buffer = this.arrayBufferToBuffer(content);
            
            // Calculate MD5 hash
            const hash = crypto.createHash('md5');
            hash.update(buffer);
            const md5Hash = hash.digest('hex');
            
            // Get file extension and original name (basename without extension)
            const extension = originalFile.extension;
            const originalName = originalFile.basename;
            
            // New filename with hash
            const newFileName = `${md5Hash}.${extension}`;
            
            // Get the parent path of the original file
            const parentPath = originalFile.parent ? originalFile.parent.path : '';
            
            // Determine target folder for renamed file
            let targetFolderPath = this.settings.outputFolder;
            let targetFilePath: string;
            
            if (targetFolderPath && targetFolderPath !== '') {
                // Ensure output folder exists
                await this.ensureFolderExists(targetFolderPath);
                targetFilePath = `${targetFolderPath}/${newFileName}`;
            } else {
                targetFilePath = parentPath ? `${parentPath}/${newFileName}` : newFileName;
            }
            
            // Check if target file already exists
            const existingFile = this.app.vault.getAbstractFileByPath(targetFilePath);
            if (existingFile) {
                console.log(`Target file already exists: ${targetFilePath}`);
                new Notice(`File already exists: ${newFileName}. Skipping to avoid overwrite.`);
                return;
            }
            
            // IMPORTANT: Use fileManager.renameFile() instead of vault.rename()
            // This ensures all links to the file are automatically updated throughout the vault
            await this.app.fileManager.renameFile(originalFile, targetFilePath);
            
            // Determine note name (use original name as base)
            let noteName: string;
            
            if (this.settings.promptForName) {
                const promptedName = await this.promptForNoteName(originalName);
                if (!promptedName) {
                    // User cancelled - file is already renamed, but that's fine
                    new Notice(`Note creation cancelled for: ${originalName}`);
                    return;
                }
                noteName = promptedName;
            } else {
                noteName = originalName;
            }
            
            // Get file size from original file stats
            const fileSize = this.formatFileSize(originalFile.stat.size);
            
            // Create note content from template
            // Note: {{originalName}} is the original filename (without extension)
            let noteContent = this.settings.noteTemplate
                .replace(/{{filename}}/g, noteName)
                .replace(/{{originalName}}/g, originalName)
                .replace(/{{hash}}/g, md5Hash)
                .replace(/{{extension}}/g, extension)
                .replace(/{{size}}/g, fileSize)
                .replace(/{{date}}/g, new Date().toLocaleString());
            
            // Add YAML frontmatter with original name and hash (removed originalPath)
            const frontmatter = `---
hash: ${md5Hash}
originalName: ${originalName}
fileType: ${extension}
fileSize: ${fileSize}
processed: ${new Date().toISOString()}
---

`;
            noteContent = frontmatter + noteContent;
            
            // Determine note path (same folder as the renamed file)
            let notePath: string;
            if (targetFolderPath && targetFolderPath !== '') {
                notePath = `${targetFolderPath}/${noteName}.md`;
            } else {
                notePath = parentPath ? `${parentPath}/${noteName}.md` : `${noteName}.md`;
            }
            
            // Ensure unique note name
            let counter = 1;
            let finalNotePath = notePath;
            while (this.app.vault.getAbstractFileByPath(finalNotePath)) {
                const nameWithoutExt = notePath.replace(/\.md$/, '');
                finalNotePath = `${nameWithoutExt}_${counter}.md`;
                counter++;
            }
            
            // Create the note
            await this.app.vault.create(finalNotePath, noteContent);
            
            new Notice(`Created: ${noteName}.md → ${newFileName}\nLinks to file updated automatically!`);
            
        } catch (error) {
            console.error(`Failed to process ${originalFile.path}:`, error);
            new Notice(`Error processing ${originalFile.name}: ${error.message}`);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Ensure a folder exists, create it if it doesn't
     */
    async ensureFolderExists(folderPath: string): Promise<TFolder> {
        const normalizedPath = folderPath.replace(/^\/+|\/+$/g, '');
        
        if (normalizedPath === '') {
            return this.app.vault.getRoot();
        }
        
        let folder = this.app.vault.getAbstractFileByPath(normalizedPath);
        
        if (!folder) {
            await this.app.vault.createFolder(normalizedPath);
            folder = this.app.vault.getAbstractFileByPath(normalizedPath);
        }
        
        if (!folder || !(folder instanceof TFolder)) {
            throw new Error(`Path exists but is not a folder: ${normalizedPath}`);
        }
        
        return folder;
    }

    /**
     * Prompt user for note name
     */
    async promptForNoteName(defaultName: string): Promise<string | null> {
        return new Promise((resolve) => {
            const modal = new NoteNameModal(this.app, defaultName, resolve);
            modal.open();
        });
    }

    /**
     * Format file size to human-readable format
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

/**
 * Modal for prompting note name
 */
class NoteNameModal extends Modal {
    private defaultName: string;
    private onSubmit: (result: string | null) => void;
    private inputEl: HTMLInputElement;

    constructor(app: App, defaultName: string, onSubmit: (result: string | null) => void) {
        super(app);
        this.defaultName = defaultName;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Enter note name' });
        
        this.inputEl = contentEl.createEl('input', {
            type: 'text',
            value: this.defaultName,
            attr: { style: 'width: 100%; margin: 10px 0;' }
        });
        
        const buttonDiv = contentEl.createDiv({ attr: { style: 'display: flex; gap: 10px; justify-content: flex-end;' } });
        
        const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => {
            this.close();
            this.onSubmit(null);
        });
        
        const okBtn = buttonDiv.createEl('button', { text: 'OK', attr: { style: 'background-color: var(--interactive-accent);' } });
        okBtn.addEventListener('click', () => {
            const value = this.inputEl.value.trim();
            this.close();
            this.onSubmit(value || this.defaultName);
        });
        
        this.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = this.inputEl.value.trim();
                this.close();
                this.onSubmit(value || this.defaultName);
            }
        });
        
        this.inputEl.focus();
        this.inputEl.select();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Settings Tab
 */
class AttachmentNoteSettingTab extends PluginSettingTab {
    plugin: AttachmentNotePlugin;

    constructor(app: App, plugin: AttachmentNotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Attachment Note Settings' });

        new Setting(containerEl)
            .setName('Input folder')
            .setDesc('Folder to watch for binary files (leave empty for vault root)')
            .addText(text => text
                .setPlaceholder('Attachments')
                .setValue(this.plugin.settings.inputFolder)
                .onChange(async (value) => {
                    this.plugin.settings.inputFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Scan subfolders recursively')
            .setDesc('Also process binary files in subfolders of the input folder')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.recursiveScan)
                .onChange(async (value) => {
                    this.plugin.settings.recursiveScan = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Output folder')
            .setDesc('Folder to move renamed files and notes to (leave empty to keep in source folder). All existing links will be automatically updated.')
            .addText(text => text
                .setPlaceholder('Processed')
                .setValue(this.plugin.settings.outputFolder)
                .onChange(async (value) => {
                    this.plugin.settings.outputFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-process files')
            .setDesc('Automatically process files when they are added to the input folder (including subfolders if recursive scan is enabled)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoProcess)
                .onChange(async (value) => {
                    this.plugin.settings.autoProcess = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Prompt for note name')
            .setDesc('Show a dialog to edit the note name before creation')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.promptForName)
                .onChange(async (value) => {
                    this.plugin.settings.promptForName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Note template')
            .setDesc('Template for the note content (use {{filename}}, {{originalName}}, {{hash}}, {{size}}, {{extension}}, {{date}})')
            .addTextArea(text => text
                .setPlaceholder('Enter note template...')
                .setValue(this.plugin.settings.noteTemplate)
                .onChange(async (value) => {
                    this.plugin.settings.noteTemplate = value;
                    await this.plugin.saveSettings();
                })
                .inputEl.setAttrs({ rows: '10', style: 'width: 100%; font-family: monospace;' }));

        containerEl.createEl('hr');
        
        containerEl.createEl('p', {
            text: '📎 How it works:',
            attr: { style: 'font-weight: bold; margin-top: 1em;' }
        });
        
        const description = containerEl.createEl('div', {
            attr: { style: 'font-size: 0.9em; color: var(--text-muted); margin-top: 0.5em; line-height: 1.5;' }
        });
        
        const recursiveText = this.plugin.settings.recursiveScan 
            ? 'and ALL subfolders recursively' 
            : '(without subfolders)';
        
        description.innerHTML = `
            • Place binary files in the input folder ${recursiveText} to auto-process them<br>
            • Or right-click any binary file and select "Create attachment note"<br>
            • Use the command palette to process all files in the input folder<br>
            • Files are renamed to &lt;MD5_HASH&gt;.&lt;ext&gt;<br>
            • Already processed files (named as MD5 hash) are automatically skipped<br>
            • ALL existing links to the file are automatically updated throughout the vault<br>
            • Notes contain YAML frontmatter with the original name and hash reference<br>
            • Markdown (.md) files are NEVER processed
        `;
    }
}