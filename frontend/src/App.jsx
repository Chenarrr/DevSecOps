import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = '/api'

function App() {
  // State for notes list and form inputs
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  // Get all notes from API
  const getNotes = async () => {
    const response = await axios.get(`${API_URL}/notes`)
    setNotes(response.data)
  }

  // Load notes when app starts
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { getNotes() }, [])

  // Add a new note
  const addNote = async (e) => {
    e.preventDefault()
    await axios.post(`${API_URL}/notes`, { title, content })
    setTitle('')
    setContent('')
    getNotes()
  }

  // Start editing a note
  const startEdit = (note) => {
    setEditingId(note._id)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  // Save edited note
  const updateNote = async (e) => {
    e.preventDefault()
    await axios.put(`${API_URL}/notes/${editingId}`, { title: editTitle, content: editContent })
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
    getNotes()
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
  }

  // Delete a note
  const deleteNote = async (id) => {
    await axios.delete(`${API_URL}/notes/${id}`)
    getNotes()
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>Notes</h1>
        <p>Capture your thoughts</p>
      </header>

      <form onSubmit={addNote} className="note-form">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Write something here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <button type="submit">Add Note</button>
      </form>

      {notes.length > 0 && (
        <div className="notes-section-header">
          <h2>Your Notes</h2>
          <span className="note-count">{notes.length}</span>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#9998;</div>
          <h3>No notes yet</h3>
          <p>Create your first note above</p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note._id} className={`note-card${editingId === note._id ? ' editing' : ''}`}>
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
                  <div className="edit-actions">
                    <button type="submit" className="save-btn">Save</button>
                    <button type="button" className="cancel-btn" onClick={cancelEdit}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <h3>{note.title}</h3>
                  <p>{note.content}</p>
                  <div className="card-actions">
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
