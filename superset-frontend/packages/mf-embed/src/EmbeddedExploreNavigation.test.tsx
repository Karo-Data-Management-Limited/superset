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
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { act, render } from 'spec/helpers/testing-library';
import { EmbeddedExploreNavigation } from './EmbeddedExploreNavigation';

test('notifies the host of pushes and replacements and unsubscribes on unmount', () => {
  const history = createMemoryHistory({ initialEntries: ['/explore'] });
  const onNavigate = jest.fn();
  const { unmount } = render(
    <Router history={history}>
      <EmbeddedExploreNavigation onNavigate={onNavigate} />
    </Router>,
  );
  expect(onNavigate).not.toHaveBeenCalled();
  act(() => history.push('/superset/dashboard/18/?edit=true#tab'));
  expect(onNavigate).toHaveBeenLastCalledWith(
    '/superset/dashboard/18/?edit=true#tab',
  );
  act(() => history.replace('/explore/?slice_id=361'));
  expect(onNavigate).toHaveBeenLastCalledWith('/explore/?slice_id=361');
  unmount();
  history.push('/superset/dashboard/20/');
  expect(onNavigate).toHaveBeenCalledTimes(2);
});

test('keeps native memory navigation available without a host callback', () => {
  const history = createMemoryHistory({ initialEntries: ['/explore'] });
  render(
    <Router history={history}>
      <EmbeddedExploreNavigation />
    </Router>,
  );
  act(() => history.push('/superset/dashboard/18/'));
  expect(history.location.pathname).toBe('/superset/dashboard/18/');
});
