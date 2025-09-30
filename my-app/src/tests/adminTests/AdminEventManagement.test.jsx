import { render, screen } from "@testing-library/react";
import AdminEventManagement from "../../pages/admin/adminEventManagement/AdminEventManagement";

describe("AdminEventManagement Component", () => {
  it("renders the main title", () => {
    render(<AdminEventManagement />);
    const title = screen.getByText(/This is the Event Management page/i);
    expect(title).toBeInTheDocument();
  });
});
