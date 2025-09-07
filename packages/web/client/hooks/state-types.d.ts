import { StateType } from './state.js'

declare global {
  interface Window {
    state: StateType
  }
}
