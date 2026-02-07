import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = '/api'

function App() {
  // State for notes list and form inputs
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

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

  // Delete a note
  const deleteNote = async (id) => {
    await axios.delete(`${API_URL}/notes/${id}`)
    getNotes()
  }

  return (
    <div className="App">
      <h1>Notes App</h1>

      <form onSubmit={addNote} className="note-form">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Content here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <button type="submit">Add Note</button>
      </form>

      <div className="notes-list">
        {notes.map((note) => (
          <div key={note._id} className="note-card ">
            <h3>{note.title}</h3>
            <p>{note.content}</p>
            <button onClick={() => deleteNote(note._id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App