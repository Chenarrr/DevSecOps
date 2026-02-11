import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import './App.css'

const API_URL = '/api'

function timeAgo(dateString) {
  if (!dateString) return ''
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ]
  for (const { label, seconds: s } of intervals) {
    const count = Math.floor(seconds / s)
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`
  }
  return 'just now'
}

function App() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [allTags, setAllTags] = useState([])
  const [activeTag, setActiveTag] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimeout = useRef(null)

  const getNotes = async () => {
    const params = {}
    if (activeTag) params.tag = activeTag
    if (searchQuery) params.search = searchQuery
    const response = await axios.get(`${API_URL}/notes`, { params })
    setNotes(response.data)
  }

  const getTags = async () => {
    const response = await axios.get(`${API_URL}/tags`)
    setAllTags(response.data)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { getNotes(); getTags() }, [activeTag, searchQuery])

  const handleSearch = (value) => {
    setSearchInput(value)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value)
    }, 300)
  }

  const addNote = async (e) => {
    e.preventDefault()
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    await axios.post(`${API_URL}/notes`, { title, content, tags: tagArray })
    setTitle('')
    setContent('')
    setTags('')
    getNotes()
    getTags()
  }

  const startEdit = (note) => {
    setEditingId(note._id)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditTags((note.tags || []).join(', '))
  }

  const updateNote = async (e) => {
    e.preventDefault()
    const tagArray = editTags.split(',').map(t => t.trim()).filter(Boolean)
    await axios.put(`${API_URL}/notes/${editingId}`, {
      title: editTitle, content: editContent, tags: tagArray
    })
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
    setEditTags('')
    getNotes()
    getTags()
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
    setEditTags('')
  }

  const togglePin = async (id) => {
    await axios.patch(`${API_URL}/notes/${id}/pin`)
    getNotes()
  }

  const deleteNote = async (id) => {
    await axios.delete(`${API_URL}/notes/${id}`)
    getNotes()
    getTags()
  }

  const filterByTag = (tag) => {
    setActiveTag(activeTag === tag ? null : tag)
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>Notes</h1>
        <p>Capture your thoughts ✨</p>
      </header>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        {searchInput && (
          <button
            className="search-clear"
            onClick={() => { setSearchInput(''); setSearchQuery('') }}
          >
            &times;
          </button>
        )}
      </div>

      <form onSubmit={addNote} className="note-form">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Write something here... (supports **markdown**)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <button type="submit">Add Note</button>
      </form>

      {notes.length > 0 && (
        <div className="notes-section-header">
          <h2>Your Notes</h2>
          <span className="note-count">{notes.length}</span>
        </div>
      )}

      {allTags.length > 0 && (
        <div className="tag-filter-bar">
          <button
            className={`tag-filter-btn${activeTag === null ? ' active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-filter-btn${activeTag === tag ? ' active' : ''}`}
              onClick={() => filterByTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{searchQuery || activeTag ? '\u{1F50D}' : '\u270E'}</div>
          <h3>{searchQuery || activeTag ? 'No matching notes' : 'No notes yet'}</h3>
          <p>{searchQuery || activeTag ? 'Try a different search or filter' : 'Create your first note above'}</p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note._id} className={`note-card${editingId === note._id ? ' editing' : ''}${note.pinned ? ' pinned' : ''}`}>
              {editingId === note._id ? (
                <form onSubmit={updateNote} className="edit-form">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Tags (comma separated)"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                  />
                  <div className="edit-actions">
                    <button type="submit" className="save-btn">Save</button>
                    <button type="button" className="cancel-btn" onClick={cancelEdit}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  {note.pinned && <div className="pin-badge">Pinned</div>}
                  <h3>{note.title}</h3>
                  <span className="note-timestamp">
                    {note.updatedAt && note.updatedAt !== note.createdAt
                      ? `Updated ${timeAgo(note.updatedAt)}`
                      : timeAgo(note.createdAt)}
                  </span>
                  {note.tags && note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.map((tag) => (
                        <span key={tag} className="tag-pill" onClick={() => filterByTag(tag)}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="note-content-md">
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  </div>
                  <div className="card-actions">
                    <button
                      className={`pin-btn${note.pinned ? ' pinned' : ''}`}
                      onClick={() => togglePin(note._id)}
                    >
                      {note.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button className="edit-btn" onClick={() => startEdit(note)}>Edit</button>
                    <button className="delete-btn" onClick={() => deleteNote(note._id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
