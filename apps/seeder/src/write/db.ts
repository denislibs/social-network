import { SQL } from 'bun'

export function openSql(url: string): SQL {
  return new SQL(url, { max: 4 })
}
