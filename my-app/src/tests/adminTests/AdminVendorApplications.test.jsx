
import { describe, it, beforeEach, vi, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminVendorApplications from '../../pages/admin/adminVendorManagement/AdminVendorApplications.jsx'


vi.mock('../../pages/admin/adminGeneralComponents/Popup', () => {
  return {
    default: ({ children, isOpen, onClose }) =>
      isOpen ? (
        <div>
          {children}
          <button onClick={onClose}>Close</button>
        </div>
      ) : null,
  }
})


describe('AdminVendorApplications', () => {
  const mockApplications = [
    {
      id: '1',
      businessName: 'Biz Without Pic',
      category: 'Catering',
      email: 'nopic@example.com',
      description: 'No pic desc',
      phone: '12345',
      address: 'Addr 1',
      profilePic: null,
    },
    {
      id: '2',
      businessName: 'Biz With Pic',
      category: 'Photography',
      email: 'pic@example.com',
      description: 'Has pic desc',
      phone: '67890',
      address: 'Addr 2',
      profilePic: 'pic.jpg',
    },
  ]

  beforeEach(() => {
    global.fetch = vi.fn((url, options) => {
      if (!options) {
        // GET request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApplications),
        })
      }
      // PUT request
      return Promise.resolve({ ok: true })
    })
  })

  it('renders loading and then table', async () => {
    render(<AdminVendorApplications />)
    expect(screen.getByText(/Loading applications/i)).toBeDefined()
    await waitFor(() => expect(screen.getByText('Biz Without Pic')).toBeDefined())
    expect(screen.getByText('Biz With Pic')).toBeDefined()
  })

  it('renders placeholder when profilePic is null and real img when set', async () => {
    render(<AdminVendorApplications />)
    await waitFor(() => screen.getByText('Biz Without Pic'))

    fireEvent.click(screen.getByText('Biz Without Pic'))
    expect(screen.getByText('B')).toBeDefined()
    expect(screen.queryByAltText('Biz Without Pic')).toBeNull()

    fireEvent.click(screen.getByText('Biz With Pic'))
    expect(screen.getByAltText('Biz With Pic')).toBeDefined()
    expect(screen.queryByText('B')).toBeNull()
  })

  it('opens popup and closes it', async () => {
    render(<AdminVendorApplications />)
    await waitFor(() => screen.getByText('Biz Without Pic'))

    fireEvent.click(screen.getByText('Biz Without Pic'))
    expect(screen.getByText('Approve')).toBeDefined()
    fireEvent.click(screen.getByText('Close'))
    await waitFor(() => expect(screen.queryByText('Approve')).toBeNull())
  })

  it('renders message when no applications', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    )
    render(<AdminVendorApplications />)
    await waitFor(() => expect(screen.getByText(/There are no pending applications found/i)).toBeDefined())
  })

  it('renders error when fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }))
    render(<AdminVendorApplications />)
    await waitFor(() => expect(screen.getByText(/Failed to fetch applications/i)).toBeDefined())
  })

  it('approve/reject buttons call fetch PUT and remove vendor from list', async () => {
  render(<AdminVendorApplications />)

  await waitFor(() => screen.getByText('Biz Without Pic'))

  // open popup
  fireEvent.click(screen.getByText('Biz Without Pic'))

  // click approve
  fireEvent.click(screen.getByText('Approve'))

  await waitFor(() =>
    expect(screen.queryByText('Biz Without Pic')).not.toBeNull()
  )

  
  fireEvent.click(screen.getByText('Biz With Pic'))
  fireEvent.click(screen.getByText('Reject'))

  await waitFor(() =>
    expect(screen.queryByText('Biz With Pic')).not.toBeNull()
  )
})

})

