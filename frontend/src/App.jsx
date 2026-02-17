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

  for (const { label, seconds: span } of intervals) {
    const count = Math.floor(seconds / span)
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
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : false
  })
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

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const handleSearch = (value) => {
    setSearchInput(value)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value)
    }, 300)
  }

  const addNote = async (e) => {
    e.preventDefault()
    const tagArray = tags.split(',').map((tag) => tag.trim()).filter(Boolean)
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
    const tagArray = editTags.split(',').map((tag) => tag.trim()).filter(Boolean)
    await axios.put(`${API_URL}/notes/${editingId}`, {
      title: editTitle,
      content: editContent,
      tags: tagArray,
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
      <main className="app-shell">
        <header className="app-header">
          <div className="header-text">
            <h1>Notes</h1>
            <p>Minimal space for your ideas.</p>
          </div>
          <button
            className="dark-mode-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </header>

        <div className="search-bar panel">
          <input
            type="text"
            placeholder="Search notes"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          {searchInput && (
            <button
              className="search-clear"
              onClick={() => {
                setSearchInput('')
                setSearchQuery('')
              }}
              type="button"
            >
              Clear
            </button>
          )}
        </div>

        <form onSubmit={addNote} className="note-form panel">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Write your note"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Tags, comma separated"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <button type="submit" className="add-btn">Save note</button>
        </form>

        {allTags.length > 0 && (
          <div className="tag-filter-bar panel">
            <button
              className={`tag-filter-btn${activeTag === null ? ' active' : ''}`}
              onClick={() => setActiveTag(null)}
              type="button"
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag-filter-btn${activeTag === tag ? ' active' : ''}`}
                onClick={() => filterByTag(tag)}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <div className="notes-section-header">
            <h2>{activeTag ? `Filtered by ${activeTag}` : 'All notes'}</h2>
            <span className="note-count">{notes.length}</span>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="empty-state panel">
            <h3>{searchQuery || activeTag ? 'No matching notes' : 'No notes yet'}</h3>
            <p>{searchQuery || activeTag ? 'Try a different search or filter.' : 'Create your first note using the form above.'}</p>
          </div>
        ) : (
          <div className="notes-list">
            {notes.map((note) => (
              <article
                key={note._id}
                className={`note-card${editingId === note._id ? ' editing' : ''}${note.pinned ? ' pinned' : ''}`}
              >
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
                      placeholder="Tags, comma separated"
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
                    {note.pinned && <span className="pin-badge">Pinned</span>}
                    <h3>{note.title}</h3>
                    <span className="note-timestamp">
                      {note.updatedAt && note.updatedAt !== note.createdAt
                        ? `Updated ${timeAgo(note.updatedAt)}`
                        : timeAgo(note.createdAt)}
                    </span>

                    {note.tags && note.tags.length > 0 && (
                      <div className="note-tags">
                        {note.tags.map((tag) => (
                          <button
                            key={tag}
                            className="tag-pill"
                            onClick={() => filterByTag(tag)}
                            type="button"
                          >
                            {tag}
                          </button>
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
                        type="button"
                      >
                        {note.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button className="edit-btn" onClick={() => startEdit(note)} type="button">Edit</button>
                      <button className="delete-btn" onClick={() => deleteNote(note._id)} type="button">Delete</button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
