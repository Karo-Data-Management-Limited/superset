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
import { MemoryRouter, useHistory, useLocation } from 'react-router-dom';
import { fireEvent, render, screen } from 'spec/helpers/testing-library';
import { EmbeddedExploreNavigation } from './EmbeddedExploreNavigation';

function NavigationControls() {
  const history = useHistory();
  const location = useLocation();
  return (
    <>
      <button
        type="button"
        onClick={() => history.push('/superset/dashboard/18/?edit=true#tab')}
      >
        Push dashboard
      </button>
      <button onClick={() => history.replace('/explore/?slice_id=361')}>
        Replace chart
      </button>
      <p>{location.pathname}</p>
    </>
  );
}

function Harness({
  onNavigate,
  subscribe = true,
}: {
  onNavigate?: (url: string) => void;
  subscribe?: boolean;
}) {
  return (
    <MemoryRouter initialEntries={['/explore']}>
      {subscribe && <EmbeddedExploreNavigation onNavigate={onNavigate} />}
      <NavigationControls />
    </MemoryRouter>
  );
}

test('notifies the host of pushes and replacements and unsubscribes on unmount', () => {
  const onNavigate = jest.fn();
  const { rerender } = render(<Harness onNavigate={onNavigate} />);
  expect(onNavigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Push dashboard' }));
  expect(onNavigate).toHaveBeenLastCalledWith(
    '/superset/dashboard/18/?edit=true#tab',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Replace chart' }));
  expect(onNavigate).toHaveBeenLastCalledWith('/explore/?slice_id=361');
  rerender(<Harness onNavigate={onNavigate} subscribe={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Push dashboard' }));
  expect(onNavigate).toHaveBeenCalledTimes(2);
});

test('keeps native memory navigation available without a host callback', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Push dashboard' }));
  expect(screen.getByText('/superset/dashboard/18/')).toBeVisible();
});
