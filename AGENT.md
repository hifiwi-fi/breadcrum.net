# Agent Development Notes

## JSDoc Typing Patterns

### Typing Database Query Results

When working with PostgreSQL queries using `pg`, you can type the query results without casting by declaring the type on the variable:

```javascript
/** @type {import('pg').QueryResult<TypeUserRead>} */
const results = await client.query(query)
return results.rows[0] // Automatically typed as TypeUserRead | undefined
```

This pattern avoids the need for type casting and provides proper typing for:
- `results.rows` - typed as `TypeUserRead[]`
- `results.rows[0]` - typed as `TypeUserRead | undefined`
- Other QueryResult properties like `rowCount`, `fields`, etc.

This is preferable to casting the return value:
```javascript
// Avoid this pattern when possible
const results = await client.query(query)
return /** @type {TypeUserRead | undefined} */ (results.rows[0])
```
