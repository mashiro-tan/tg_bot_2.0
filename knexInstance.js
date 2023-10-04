import Knex from 'knex'
import configuration from './knexfile.js'

const db = Knex(configuration)

export default db