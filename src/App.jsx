import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db, getPlaceInfoByName } from './firebase'
import './App.css'

function App() {
  const [places, setPlaces] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const placesSnap = await getDocs(collection(db, 'places'))
        const placeNames = placesSnap.docs.map((d) => d.id)

        const results = await Promise.all(
          placeNames.map((name) => getPlaceInfoByName(name)),
        )
        setPlaces(results.filter(Boolean))
      } catch (err) {
        setError(err?.message ?? 'Failed to load data')
      }
    }
    loadPlaces()
  }, [])

  return (
    <>
      <h1>Places</h1>
      {error ? <p>{error}</p> : null}
      {places.length === 0 ? <p>No places found.</p> : null}
      {places.map((place) => (
        <div key={place.id} style={{ marginBottom: '1rem' }}>
          <h2>{place.id}</h2>
          {place.address ? <p>Address: {place.address}</p> : null}
          {place.people?.length ? (
            <ul>
              {place.people.map((person) => (
                <li key={person.id}>
                  <strong>{person.name ?? person.Name ?? person.id}</strong>
                  {person.bio ? ` — ${person.bio}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p>No people.</p>
          )}
        </div>
      ))}
    </>
  )
}

export default App
