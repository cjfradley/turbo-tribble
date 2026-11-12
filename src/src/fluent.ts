/**
 * Registers the Fluent UI Web Components the app uses and applies the Fluent 2 theme.
 * Each import defines one <fluent-*> custom element; add new ones here as they're needed.
 */
import { setTheme } from '@fluentui/web-components'
import { webLightTheme } from '@fluentui/tokens'

import '@fluentui/web-components/button.js'
import '@fluentui/web-components/text-input.js'
import '@fluentui/web-components/field.js'
import '@fluentui/web-components/spinner.js'
import '@fluentui/web-components/message-bar.js'
import '@fluentui/web-components/badge.js'
import '@fluentui/web-components/avatar.js'
import '@fluentui/web-components/divider.js'

setTheme(webLightTheme)
