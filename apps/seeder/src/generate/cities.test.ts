import { describe, expect, it } from 'bun:test'
import { CITIES, cityForm } from './cities'

describe('cityForm', () => {
  it('has an entry for every city in CITIES', () => {
    for (const city of CITIES) {
      expect(cityForm(city, 'gen'), `gen(${city})`).not.toBe('')
      expect(cityForm(city, 'loc'), `loc(${city})`).not.toBe('')
    }
  })
  it('declines Москва to locative', () => {
    expect(cityForm('Москва', 'loc')).toBe('Москве')
  })
  it('declines Нижний Новгород to genitive', () => {
    expect(cityForm('Нижний Новгород', 'gen')).toBe('Нижнего Новгорода')
  })
  it('leaves indeclinable Тольятти unchanged in genitive', () => {
    expect(cityForm('Тольятти', 'gen')).toBe('Тольятти')
  })
  it('returns an unknown city name unchanged', () => {
    expect(cityForm('Неизвестск', 'gen')).toBe('Неизвестск')
  })
  it('returns nominative unchanged for a known city', () => {
    expect(cityForm('Казань', 'nom')).toBe('Казань')
  })
})
