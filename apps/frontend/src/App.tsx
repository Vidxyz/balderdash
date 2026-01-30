import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Host from './pages/Host'
import Game from './pages/Game'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<Host />} />
        <Route path="/game/:code" element={<Game />} />
      </Routes>
    </Router>
  )
}

export default App
