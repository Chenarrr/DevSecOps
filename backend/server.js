const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err))

const Note = mongoose.model('Note', {
  title: String,
  content: String
})

app.get('/api/notes', async (req, res) => {
  const notes = await Note.find()
  res.json(notes)
})

app.post('/api/notes', async (req, res) => {
  const note = new Note(req.body)
  await note.save()
  res.json(note)
})

app.delete('/api/notes/:id', async (req, res) => {
  await Note.findByIdAndDelete(req.params.id)
  res.json({ message: 'Deleted' })
})

app.listen(5000, () => console.log('Server running on port 5000'))