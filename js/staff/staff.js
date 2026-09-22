import { requireSession } from '../auth/guard.js';
import { renderShell } from '../shared/layout.js';
import { api } from '../api/client.js';
import {
  emptyState,
  escapeHtml,
  showToast,
  withButtonLoading
} from '../shared/ui.js';

const session = await requireSession();

renderShell(session, 'staff.html');

const list = document.getElementById('staff-list');
const branch = document.getElementById('staff-branch');
const form = document.getElementById('staff-form');
const submitButton = document.getElementById('staff-submit');
const refreshButton = document.getElementById('refresh-staff');

function addMobileLabels(table) {
  const headers = Array.from(
    table.querySelectorAll('thead th')
  ).map((th) => th.textContent.trim());

  table.querySelectorAll('tbody tr').forEach((row) => {
    Array.from(row.children).forEach((cell, index) => {
      if (headers[index]) {
        cell.setAttribute('data-label', headers[index]);
      }
    });
  });
}

async function load() {
  list.innerHTML = `
    <div class="empty-state">
      Loading team…
    </div>
  `;

  try {
    const result = await api.get('/staff');

    if (!result.data.length) {
      emptyState(list, {
        title: 'No staff yet',
        message: 'Add your first team member and assign their role.'
      });

      return;
    }

    list.innerHTML = `
      <div class="table-wrap mobile-cards">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${result.data
              .map(
                (member) => `
                  <tr>
                    <td>
                      <strong>
                        ${escapeHtml(member.user?.fullName || '')}
                      </strong>

                      <br>

                      <small class="topbar-meta">
                        ${escapeHtml(member.user?.email || '')}
                      </small>
                    </td>

                    <td>
                      ${escapeHtml(member.role?.name || '')}
                    </td>

                    <td>
                      ${escapeHtml(
                        member.branch?.name || 'All branches'
                      )}
                    </td>

                    <td>
                      <span class="badge ${
                        member.status === 'ACTIVE'
                          ? 'badge-success'
                          : 'badge-muted'
                      }">
                        ${escapeHtml(member.status)}
                      </span>
                    </td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    const table = list.querySelector('table');

    if (table) {
      addMobileLabels(table);
    }
  } catch (error) {
    emptyState(list, {
      title: 'Team unavailable',
      message: 'Try again in a moment.'
    });

    showToast(error.message, 'error');
  }
}

async function loadBranches() {
  try {
    const branches = await api.get('/branches');

    if (!branches.data.length) {
      branch.innerHTML = `
        <option value="">
          No branches available
        </option>
      `;

      branch.disabled = true;
      submitButton.disabled = true;

      showToast(
        'Create a branch before adding staff.',
        'error'
      );

      return;
    }

    branch.disabled = false;
    submitButton.disabled = false;

    branch.innerHTML = branches.data
      .map(
        (item) => `
          <option value="${item._id}">
            ${escapeHtml(item.name)}
          </option>
        `
      )
      .join('');
  } catch (error) {
    branch.innerHTML = `
      <option value="">
        Unable to load branches
      </option>
    `;

    branch.disabled = true;
    submitButton.disabled = true;

    showToast(error.message, 'error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  await withButtonLoading(
    submitButton,
    'Adding…',
    async () => {
      try {
        await api.post('/staff', {
          fullName: document
            .getElementById('staff-name')
            .value
            .trim(),

          email: document
            .getElementById('staff-email')
            .value
            .trim(),

          password: document
            .getElementById('staff-password')
            .value,

          roleName: document
            .getElementById('staff-role')
            .value,

          branchId: branch.value
        });

        form.reset();

        showToast(
          'Staff member added.',
          'success'
        );

        await load();
      } catch (error) {
        showToast(
          error.message,
          'error'
        );
      }
    }
  );
});

refreshButton.addEventListener(
  'click',
  async () => {
    await load();
  }
);

await loadBranches();
await load();
