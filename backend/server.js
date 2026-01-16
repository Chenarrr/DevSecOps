const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err))

// Note model
const Note = mongoose.model('Note', {
  title: String,
  content: String
})

// Get all notes
app.get('/api/notes', async (req, res) => {
  const notes = await Note.find()
  res.json(notes)
})

// Create note
app.post('/api/notes', async (req, res) => {
  const note = new Note(req.body)
  await note.save()
  res.json(note)
})

// Delete note
app.delete('/api/notes/:id', async (req, res) => {
  await Note.findByIdAndDelete(req.params.id)
  res.json({ message: 'Deleted' })
})

// Start server
app.listen(5000, () => console.log('Server running on port 5000'))