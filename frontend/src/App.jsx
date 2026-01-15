import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://localhost:5000/api/notes'

function App() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editId, setEditId] = useState(null)

  // Fetch notes on component mount
  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const response = await axios.get(API_URL)
      setNotes(response.data)
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (editId) {
      // Update existing note
      try {
        await axios.put(`${API_URL}/${editId}`, { title, content })
        fetchNotes()
        resetForm()
      } catch (error) {
        console.error('Error updating note:', error)
      }
    } else {
      // Create new note
      try {
        await axios.post(API_URL, { title, content })
        fetchNotes()
        resetForm()
      } catch (error) {
        console.error('Error creating note:', error)
      }
    }
  }

  const handleEdit = (note) => {
    setTitle(note.title)
    setContent(note.content)
    setEditId(note._id)
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`)
      fetchNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setEditId(null)
  }

  return (
    <div className="App">
      <h1>📝 Notes App</h1>
      
      <form onSubmit={handleSubmit} className="note-form">
        <input
          type="text"
          placeholder="Note Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Note Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows="4"
        />
        <div className="form-buttons">
          <button type="submit">
            {editId ? 'Update Note' : 'Add Note'}
          </button>
          {editId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="notes-list">
        {notes.map((note) => (
          <div key={note._id} className="note-card">
            <h3>{note.title}</h3>
            <p>{note.content}</p>
            <div className="note-actions">
              <button onClick={() => handleEdit(note)}>Edit</button>
              <button onClick={() => handleDelete(note._id)}>Delete</button>
            </div>
            <small>{new Date(note.createdAt).toLocaleDateString()}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App