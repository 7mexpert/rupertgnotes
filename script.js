// RupertG Notes - JavaScript Application
class RupertGNotes {
    constructor() {
        this.notes = [];
        this.currentEditId = null;
        this.nextId = 1;
        
        // DOM Elements
        this.notesContainer = document.getElementById('notesContainer');
        this.addNoteBtn = document.getElementById('addNoteBtn');
        this.noteTypesModal = document.getElementById('noteTypesModal');
        this.cancelModalBtn = document.getElementById('cancelModalBtn');
        this.editMode = document.createElement('div');
        
        // Initialize
        this.init();
    }
    
    init() {
        this.loadNotes();
        this.renderNotes();
        this.setupEventListeners();
        this.setupEditMode();
        this.setupViewMode();
    }
    
    setupEventListeners() {
        // Add note button
        this.addNoteBtn.addEventListener('click', () => {
            this.showNoteTypesModal();
        });
        
        // Modal events
        this.cancelModalBtn.addEventListener('click', () => {
            this.hideNoteTypesModal();
        });
        
        // Close modal when clicking outside
        this.noteTypesModal.addEventListener('click', (e) => {
            if (e.target === this.noteTypesModal) {
                this.hideNoteTypesModal();
            }
        });
        
        // Type selection
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.createNote(type);
                this.hideNoteTypesModal();
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N for new note
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.showNoteTypesModal();
            }
            
            // Escape to close modal or edit mode
            if (e.key === 'Escape') {
                this.hideNoteTypesModal();
                if (this.currentEditId) {
                    this.closeEditMode();
                }
            }
        });
    }
    
    setupEditMode() {
        this.editMode.className = 'edit-mode';
        this.editMode.innerHTML = `
            <div class="edit-header">
                <div class="edit-title">Edit Note</div>
                <div class="edit-actions">
                    <button class="edit-btn" id="cancelEditBtn">Cancel</button>
                    <button class="edit-btn primary" id="saveEditBtn">Save</button>
                </div>
            </div>
            <div class="edit-content" id="editContent">
                <!-- Content will be injected here -->
            </div>
        `;
        
        document.body.appendChild(this.editMode);
        
        // Edit mode events
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.closeEditMode();
        });
        
        document.getElementById('saveEditBtn').addEventListener('click', () => {
            this.saveEdit();
        });
    }
    
    setupViewMode() {
        this.viewMode = document.createElement('div');
        this.viewMode.className = 'view-mode';
        this.viewMode.innerHTML = `
            <div class="view-header">
                <div class="view-title">View Note</div>
                <div class="view-actions">
                    <button class="view-btn" id="closeViewBtn">Close</button>
                    <button class="view-btn primary" id="editViewBtn">Edit</button>
                </div>
            </div>
            <div class="view-content" id="viewContent">
                <!-- Content will be injected here -->
            </div>
        `;
        
        document.body.appendChild(this.viewMode);
        
        // View mode events
        document.getElementById('closeViewBtn').addEventListener('click', () => {
            this.closeViewMode();
        });
        
        document.getElementById('editViewBtn').addEventListener('click', () => {
            this.closeViewMode();
            // Small delay to ensure view mode is fully closed before opening edit mode
            setTimeout(() => {
                this.editNote(this.currentViewId);
            }, 50);
        });
    }
    
    openViewMode(id) {
        this.currentViewId = id;
        const note = this.notes.find(n => n.id === id);
        
        if (!note) return;
        
        const viewContent = document.getElementById('viewContent');
        
        const createdAt = new Date(note.createdAt);
        const updatedAt = new Date(note.updatedAt);
        const dateStr = updatedAt.toLocaleDateString();
        const timeStr = updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (note.type === 'text') {
            viewContent.innerHTML = `
                <div class="view-note-info">
                    <h1 class="view-note-title">${this.escapeHtml(note.title)}</h1>
                    <div class="view-note-meta">Created: ${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div class="view-note-meta">Last updated: ${dateStr} at ${timeStr}</div>
                </div>
                <div class="view-note-content">
                    ${note.content ? this.escapeHtml(note.content) : '<span style="color: var(--text-secondary); font-style: italic;">No content</span>'}
                </div>
            `;
        } else {
            const itemsHtml = note.content.map((item, index) => `
                <div class="view-checklist-item ${item.completed ? 'completed' : ''}">
                    <input type="checkbox" ${item.completed ? 'checked' : ''} data-index="${index}">
                    <label>${this.escapeHtml(item.text)}</label>
                </div>
            `).join('');
            
            const completedCount = note.content.filter(item => item.completed).length;
            
            viewContent.innerHTML = `
                <div class="view-note-info">
                    <h1 class="view-note-title">${this.escapeHtml(note.title)}</h1>
                    <div class="view-note-meta">Created: ${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div class="view-note-meta">Last updated: ${dateStr} at ${timeStr}</div>
                    <div class="view-note-meta" style="margin-top: 10px; font-weight: 600; color: var(--primary-color);">
                        ${completedCount}/${note.content.length} items completed
                    </div>
                </div>
                <div class="view-checklist">
                    ${itemsHtml}
                </div>
            `;
        }
        
        this.viewMode.style.display = 'flex';
        
        // Add event listener for checklist items in view mode
        if (note.type === 'checklist') {
            const checklistItems = this.viewMode.querySelectorAll('.view-checklist-item input[type="checkbox"]');
            checklistItems.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.handleViewChecklistToggle(e.target);
                });
            });
        }
    }
    
    closeViewMode() {
        this.viewMode.style.display = 'none';
        this.currentViewId = null;
    }
    
    handleViewChecklistToggle(checkbox) {
        const index = parseInt(checkbox.dataset.index);
        const note = this.notes.find(n => n.id === this.currentViewId);
        if (note && note.content[index]) {
            note.content[index].completed = checkbox.checked;
            note.updatedAt = new Date().toISOString();
            this.saveNotes();
            // Re-render the view to update the completed count
            this.openViewMode(this.currentViewId);
        }
    }
    
    showNoteTypesModal() {
        this.noteTypesModal.style.display = 'flex';
        // Focus first option for accessibility
        setTimeout(() => {
            document.querySelector('.type-option').focus();
        }, 100);
    }
    
    hideNoteTypesModal() {
        this.noteTypesModal.style.display = 'none';
    }
    
    createNote(type) {
        const now = new Date();
        const note = {
            id: this.nextId++,
            type: type,
            title: type === 'text' ? 'Untitled Note' : 'Untitled Checklist',
            content: type === 'text' ? '' : [],
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };
        
        this.notes.unshift(note);
        this.saveNotes();
        this.renderNotes();
        
        // Auto-edit the new note
        setTimeout(() => {
            this.openEditMode(note.id);
        }, 100);
    }
    
    editNote(id) {
        this.openEditMode(id);
    }
    
    deleteNote(id) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(note => note.id !== id);
            this.saveNotes();
            this.renderNotes();
        }
    }
    
    openEditMode(id) {
        this.currentEditId = id;
        const note = this.notes.find(n => n.id === id);
        
        if (!note) return;
        
        const editContent = document.getElementById('editContent');
        
        if (note.type === 'text') {
            editContent.innerHTML = `
                <input type="text" id="editTitle" value="${this.escapeHtml(note.title)}" placeholder="Note title" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 20px; font-size: 1.1rem; font-weight: 600;">
                <textarea id="editContentText" class="edit-textarea" placeholder="Start writing...">${this.escapeHtml(note.content)}</textarea>
            `;
        } else {
            const itemsHtml = note.content.map((item, index) => `
                <div class="checklist-item-edit">
                    <input type="checkbox" ${item.completed ? 'checked' : ''} data-index="${index}">
                    <input type="text" value="${this.escapeHtml(item.text)}" data-index="${index}" style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px;">
                    <button class="delete-item-btn" data-index="${index}">Delete</button>
                </div>
            `).join('');
            
            editContent.innerHTML = `
                <input type="text" id="editTitle" value="${this.escapeHtml(note.title)}" placeholder="Checklist title" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 20px; font-size: 1.1rem; font-weight: 600;">
                <div class="edit-checklist" id="editChecklistItems">
                    ${itemsHtml}
                </div>
                <div class="checklist-input-group" style="margin-top: 20px;">
                    <input type="text" id="newChecklistItem" class="checklist-input" placeholder="Add new item...">
                    <button class="add-item-btn" id="addChecklistItemBtn">Add Item</button>
                </div>
            `;
            
            // Add event listeners for checklist items
            this.setupChecklistEditEvents();
        }
        
        this.editMode.style.display = 'flex';
        
        // Focus on title input
        setTimeout(() => {
            document.getElementById('editTitle').focus();
        }, 100);
    }
    
    setupChecklistEditEvents() {
        const checklistItems = document.getElementById('editChecklistItems');
        if (checklistItems) {
            checklistItems.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    this.handleChecklistItemToggle(e.target);
                }
            });
            
            checklistItems.addEventListener('input', (e) => {
                if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
                    this.handleChecklistItemEdit(e.target);
                }
            });
            
            checklistItems.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-item-btn')) {
                    this.handleChecklistItemDelete(e.target);
                }
            });
        }
        
        const addItemBtn = document.getElementById('addChecklistItemBtn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                this.addChecklistItem();
            });
        }
        
        const newItemInput = document.getElementById('newChecklistItem');
        if (newItemInput) {
            newItemInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addChecklistItem();
                }
            });
        }
    }
    
    handleChecklistItemToggle(checkbox) {
        const index = parseInt(checkbox.dataset.index);
        const note = this.notes.find(n => n.id === this.currentEditId);
        if (note && note.content[index]) {
            note.content[index].completed = checkbox.checked;
            note.updatedAt = new Date().toISOString();
        }
    }
    
    handleChecklistItemEdit(input) {
        const index = parseInt(input.dataset.index);
        const note = this.notes.find(n => n.id === this.currentEditId);
        if (note && note.content[index]) {
            note.content[index].text = input.value;
            note.updatedAt = new Date().toISOString();
        }
    }
    
    handleChecklistItemDelete(button) {
        const index = parseInt(button.dataset.index);
        const note = this.notes.find(n => n.id === this.currentEditId);
        if (note) {
            note.content.splice(index, 1);
            note.updatedAt = new Date().toISOString();
            this.renderEditMode();
        }
    }
    
    addChecklistItem() {
        const input = document.getElementById('newChecklistItem');
        const value = input.value.trim();
        
        if (value) {
            const note = this.notes.find(n => n.id === this.currentEditId);
            if (note) {
                note.content.push({
                    text: value,
                    completed: false
                });
                note.updatedAt = new Date().toISOString();
                input.value = '';
                this.renderEditMode();
            }
        }
    }
    
    renderEditMode() {
        if (!this.currentEditId) return;
        
        const note = this.notes.find(n => n.id === this.currentEditId);
        if (!note) return;
        
        this.openEditMode(this.currentEditId);
    }
    
    saveEdit() {
        if (!this.currentEditId) return;
        
        const note = this.notes.find(n => n.id === this.currentEditId);
        if (!note) return;
        
        const titleInput = document.getElementById('editTitle');
        note.title = titleInput.value.trim() || (note.type === 'text' ? 'Untitled Note' : 'Untitled Checklist');
        
        if (note.type === 'text') {
            const contentInput = document.getElementById('editContentText');
            note.content = contentInput.value;
        } else {
            // Update checklist items
            const items = [];
            const itemElements = document.querySelectorAll('.checklist-item-edit');
            
            itemElements.forEach(element => {
                const checkbox = element.querySelector('input[type="checkbox"]');
                const textInput = element.querySelector('input[type="text"]');
                
                items.push({
                    text: textInput.value,
                    completed: checkbox.checked
                });
            });
            
            note.content = items;
        }
        
        note.updatedAt = new Date().toISOString();
        this.saveNotes();
        this.closeEditMode();
        this.renderNotes();
    }
    
    closeEditMode() {
        this.editMode.style.display = 'none';
        this.currentEditId = null;
    }
    
    renderNotes() {
        if (this.notes.length === 0) {
            this.notesContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No Notes Yet</h3>
                    <p>Click the + button to create your first note</p>
                </div>
            `;
            return;
        }
        
        this.notesContainer.innerHTML = this.notes.map(note => {
            return this.renderNoteCard(note);
        }).join('');
        
        // Add click-to-view functionality to note cards
        this.notesContainer.querySelectorAll('.note-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons
                if (e.target.closest('.note-actions') || e.target.closest('.delete-btn')) {
                    return;
                }
                const noteId = parseInt(card.dataset.id);
                this.openViewMode(noteId);
            });
            
            // Add drag and drop functionality
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
            });
            
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
                // Remove drag-over class from all cards
                this.notesContainer.querySelectorAll('.note-card').forEach(c => {
                    c.classList.remove('drag-over');
                    c.querySelector('.reorder-indicator').style.opacity = '0';
                });
            });
            
            // Add drag over and drop events
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                card.classList.add('drag-over');
                card.querySelector('.reorder-indicator').style.opacity = '1';
                e.dataTransfer.dropEffect = 'move';
            });
            
            card.addEventListener('dragleave', (e) => {
                card.classList.remove('drag-over');
                card.querySelector('.reorder-indicator').style.opacity = '0';
            });
            
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                card.querySelector('.reorder-indicator').style.opacity = '0';
                
                const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
                const targetId = parseInt(card.dataset.id);
                
                if (draggedId !== targetId) {
                    this.reorderNotes(draggedId, targetId);
                }
            });
        });
    }
    
    renderNoteCard(note) {
        const createdAt = new Date(note.createdAt);
        const updatedAt = new Date(note.updatedAt);
        const dateStr = updatedAt.toLocaleDateString();
        const timeStr = updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let contentPreview = '';
        let contentClass = '';
        
        if (note.type === 'text') {
            contentClass = 'text-note';
            const text = note.content || '';
            if (!text) {
                contentPreview = '<div class="note-preview" style="color: var(--text-secondary); font-style: italic;">Empty note</div>';
            } else {
                contentPreview = `
                    <div class="note-preview">${this.escapeHtml(text)}</div>
                    <div class="note-meta" style="margin-top: 8px;">${text.length} characters</div>
                `;
            }
        } else {
            contentClass = 'checklist-note';
            const items = note.content || [];
            if (items.length === 0) {
                contentPreview = '<div class="note-preview" style="color: var(--text-secondary); font-style: italic;">No items</div>';
            } else {
                const completedCount = items.filter(item => item.completed).length;
                const previewItems = items.slice(0, 4).map(item => `
                    <div class="checklist-preview-item ${item.completed ? 'completed' : ''}">
                        <input type="checkbox" ${item.completed ? 'checked' : ''} disabled>
                        <span>${this.escapeHtml(item.text)}</span>
                    </div>
                `).join('');
                
                contentPreview = `
                    <div class="note-preview">
                        ${previewItems}
                        ${items.length > 4 ? `<div style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 6px;">+ ${items.length - 4} more items</div>` : ''}
                    </div>
                    <div class="checklist-stats">
                        ${completedCount}/${items.length} completed
                    </div>
                `;
            }
        }
        
        return `
            <div class="note-card ${contentClass}" data-id="${note.id}">
                <div class="note-header">
                    <div>
                        <div class="note-title">${this.escapeHtml(note.title)}</div>
                        <div class="note-meta">${dateStr} at ${timeStr}</div>
                    </div>
                    <div class="note-actions">
                        <button class="edit-btn-note" onclick="event.stopPropagation(); app.editNote(${note.id})" title="Edit Note">✏️ Edit</button>
                        <button class="delete-btn" onclick="event.stopPropagation(); app.deleteNote(${note.id})" title="Delete Note">🗑️ Delete</button>
                    </div>
                </div>
                <div class="note-content">
                    ${contentPreview}
                </div>
            </div>
        `;
    }
    
    loadNotes() {
        try {
            const saved = localStorage.getItem('rupertg_notes');
            if (saved) {
                const data = JSON.parse(saved);
                this.notes = data.notes || [];
                this.nextId = data.nextId || 1;
            } else {
                // Create a sample note for first-time users
                this.createSampleNote();
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            this.notes = [];
            this.createSampleNote();
        }
    }
    
    createSampleNote() {
        const sampleNote = {
            id: this.nextId++,
            type: 'text',
            title: 'Welcome to RupertG Notes!',
            content: 'This is a sample note to get you started. You can create text notes and checklists. Your notes are automatically saved to your browser and will persist when you reload the page.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.notes.push(sampleNote);
        this.saveNotes();
    }
    
    saveNotes() {
        try {
            const data = {
                notes: this.notes,
                nextId: this.nextId,
                version: '1.0.0'
            };
            localStorage.setItem('rupertg_notes', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving notes:', error);
        }
    }
    
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        return text
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#039;');
    }
    
    reorderNotes(draggedId, targetId) {
        const draggedIndex = this.notes.findIndex(note => note.id === draggedId);
        const targetIndex = this.notes.findIndex(note => note.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
            return;
        }
        
        // Remove the dragged note
        const [draggedNote] = this.notes.splice(draggedIndex, 1);
        
        // Insert it at the target position
        this.notes.splice(targetIndex, 0, draggedNote);
        
        // Save and re-render
        this.saveNotes();
        this.renderNotes();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RupertGNotes();
});

// Handle page visibility to ensure data is saved
document.addEventListener('visibilitychange', () => {
    if (window.app) {
        window.app.saveNotes();
    }
});

// Handle beforeunload to ensure data is saved
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.saveNotes();
    }
});