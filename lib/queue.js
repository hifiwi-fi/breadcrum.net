import PQueue from 'p-queue'

export const queue = new PQueue({
  concurrency: 10,
  timeout: 10000
})

let count = 0

queue.on('active', () => {
  console.log(`Working on item #${++count}.  Size: ${queue.size}  Pending: ${queue.pending}`)
})

queue.on('error', error => {
  console.error(error)
})

queue.on('idle', () => {
  console.log(`Queue is idle.  Size: ${queue.size}  Pending: ${queue.pending}`)
})

queue.on('add', () => {
  console.log(`Task is added.  Size: ${queue.size}  Pending: ${queue.pending}`)
})

queue.on('next', () => {
  console.log(`Task is completed.  Size: ${queue.size}  Pending: ${queue.pending}`)
})
