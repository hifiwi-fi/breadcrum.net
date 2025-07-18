import { state } from './state.js'

declare global {
  interface Window {
    state: state
  }
}
