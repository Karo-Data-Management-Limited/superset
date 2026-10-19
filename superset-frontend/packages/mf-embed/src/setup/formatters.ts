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
 * Register Superset's smart-date / number formatters with the @superset-ui/core
 * registries. Without this, `getTimeFormatter('smart_date_verbose')` (the
 * default echarts timeseries tooltip format) falls through and the tooltip
 * header shows the literal string instead of a formatted date.
 *
 * Mirrors `superset-frontend/src/preamble.ts`. Side-effect on import.
 */
// @ts-expect-error — vendored .ts; resolved via webpack alias `src` → vendor/superset-frontend
import setupFormatters from 'src/setup/setupFormatters';

setupFormatters({}, {});
