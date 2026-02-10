const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err))

const noteSchema = new mongoose.Schema({
  title: String,
  content: String,
  pinned: { type: Boolean, default: false },
  tags: { type: [String], default: [] }
}, { timestamps: true })

const Note = mongoose.model('Note', noteSchema)

app.get('/api/notes', async (req, res) => {
  const filter = {}
  if (req.query.tag) {
    filter.tags = req.query.tag
  }
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { content: { $regex: req.query.search, $options: 'i' } },
      { tags: { $regex: req.query.search, $options: 'i' } }
    ]
  }
  const notes = await Note.find(filter).sort({ pinned: -1, createdAt: -1 })
  res.json(notes)
})

app.get('/api/tags', async (req, res) => {
  const tags = await Note.distinct('tags')
  res.json(tags)
})

app.post('/api/notes', async (req, res) => {
  const note = new Note(req.body)
  await note.save()
  res.json(note)
})

app.put('/api/notes/:id', async (req, res) => {
  const note = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true })
  res.json(note)
})

app.patch('/api/notes/:id/pin', async (req, res) => {
  const note = await Note.findById(req.params.id)
  const updated = await Note.findByIdAndUpdate(
    req.params.id,
    { pinned: !note.pinned },
    { new: true, timestamps: false }
  )
  res.json(updated)
})

app.delete('/api/notes/:id', async (req, res) => {
  await Note.findByIdAndDelete(req.params.id)
  res.json({ message: 'Deleted' })
})

app.listen(5000, () => console.log('Server running on port 5000'))
