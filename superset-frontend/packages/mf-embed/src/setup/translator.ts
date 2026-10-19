/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
/**
 * Translator setup for the @apache-superset/core i18n layer.
 *
 *  1. SYNCHRONOUS passthrough at module-load. Many vendored modules call
 *     `t(...)` at import time and warn if the Translator isn't configured, so
 *     `configure()` with no args immediately (installs a default English
 *     passthrough). MUST evaluate before any such vendored module.
 *  2. PER-LOCALE pack loading via `ensureLanguagePack(lang)` — fetch the pack
 *     for an explicit locale from Superset's `/superset/language_pack/<lang>/`
 *     route (via the host appRoot) and re-`configure()`.
 *
 * Host-agnostic: appRoot comes from {@link getEmbedConfig}.
 */
import { configure } from '@apache-superset/core/translation';
import { getEmbedConfig } from '../config';

const { appRoot: APP_ROOT } = getEmbedConfig();
const LANGUAGE_PACK_TIMEOUT_MS = 5000;

// Synchronous passthrough so module-load `t(...)` calls don't warn.
configure();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const packFetches = new Map<string, Promise<any>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fetchLanguagePack(lang: string): Promise<any> {
  const cached = packFetches.get(lang);
  if (cached) return cached;

  const pending = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      LANGUAGE_PACK_TIMEOUT_MS,
    );
    try {
      const res = await fetch(`${APP_ROOT}/superset/language_pack/${lang}/`, {
        credentials: 'include',
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(
          `[mf-embed] language_pack/${lang} returned ${res.status}`,
        );
      }
      return await res.json();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[mf-embed] language pack load failed for "${lang}"; using English`,
        err,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();

  packFetches.set(lang, pending);
  return pending;
}

/**
 * Configure the Translator for `lang`, fetching its pack if needed. English
 * short-circuits to the passthrough. Never rejects — on failure stays English.
 */
export async function ensureLanguagePack(lang: string): Promise<void> {
  const normalized = lang || 'en';
  if (normalized === 'en') {
    configure();
    return;
  }
  const pack = await fetchLanguagePack(normalized);
  if (pack) {
    configure({ languagePack: pack });
  } else {
    configure();
  }
}
