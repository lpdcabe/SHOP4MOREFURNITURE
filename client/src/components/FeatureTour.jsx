import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

function getActiveTabName() {
  const activeTab = document.querySelector('.page-tab-btn.active');
  return activeTab ? activeTab.textContent.trim() : '';
}

function getStepsForRoute(pathname) {
  const activeTab = getActiveTabName();

  if (pathname === '/dashboard') {
    return [
      {
        selector: '.sidebar',
        title: 'Navigation Sidebar',
        description:
          'Hover over the sidebar on desktop or tablet to switch between all system modules.'
      },
      {
        selector: '.mobile-menu-btn',
        title: 'Navigation Menu',
        description:
          'Tap the menu button to open the navigation sidebar and switch between all system modules.'
      },
      {
        selector: '.user-avatar-btn',
        title: 'Account Menu',
        description: 'Click your avatar to open System Settings or Log out of your account.'
      },
      {
        selector: '.page-body > .row:first-of-type',
        title: 'Quick KPI Cards',
        description:
          'See live totals for Products, Current Stock, Low Stock, and Suppliers. Click any card to jump directly to that page.'
      },
      {
        selector: '.page-body > .row:nth-of-type(2) .col-lg-8',
        title: 'Monthly Inventory Movement',
        description:
          'Compare monthly Stock In vs. Stock Out quantities from your transactions. Click Refresh anytime to reload live data.'
      },
      {
        selector: '.page-body > .row:nth-of-type(2) .col-lg-4',
        title: 'Inventory Status Chart',
        description:
          'Shows the breakdown of products currently In Stock, Low Stock, and Out of Stock.'
      },
      {
        selector: '.page-body > .card:last-of-type',
        title: 'Recent Stock Activity',
        description:
          'Review the latest Stock In and Stock Out transactions, or click Stock In / Stock Out to record a new movement right from here.'
      }
    ];
  }

  if (pathname === '/inventory') {
    const baseHeader = [
      {
        selector: '.app-header-controls',
        title: 'Search & Filter Inventory',
        description:
          'Search by product code, name, category, or supplier, or click Filter to narrow by Category and Stock Status.'
      },
      {
        selector: '.page-tabs',
        title: 'Inventory Control Tabs',
        description:
          'Switch between Inventory List, Safety Stock calculations, and Reorder Point alerts.'
      }
    ];

    if (activeTab.includes('Safety Stock')) {
      return [
        ...baseHeader,
        {
          selector: '.page-body .card .d-flex.align-items-center.gap-2',
          title: 'Import & Export Safety Stock',
          description:
            'Import your Safety Stock CSV sheet or export the current calculations to CSV.'
        },
        {
          selector: '.page-body .table',
          title: 'Safety Stock Calculation',
          description:
            'Edit Maximum/Average Daily Demand and Lead Time inline—Safety Stock automatically recalculates and saves to Supabase.'
        },
        {
          selector: '.pagination-controls',
          title: 'Table Pagination',
          description: 'Browse 10 items per page using the page controls.'
        }
      ];
    }

    if (activeTab.includes('Reorder Point')) {
      return [
        ...baseHeader,
        {
          selector: '.page-body .card .btn-maroon',
          title: 'Export Reorder Point CSV',
          description: 'Download the Reorder Point table as a CSV spreadsheet.'
        },
        {
          selector: '.page-body > .card:first-of-type .table',
          title: 'Reorder Point Calculation',
          description:
            'Shows Reorder Point = (Average Daily Demand × Lead Time) + Safety Stock compared against Current Stock.'
        },
        {
          selector: '.page-body > .card:last-of-type',
          title: 'Products Below Reorder Point',
          description:
            'Lists items at or below their Reorder Point so you know what to restock right away.'
        }
      ];
    }

    return [
      ...baseHeader,
      {
        selector: '.mobile-action-row',
        title: 'Stock In, Stock Out & Export',
        description:
          'Log Stock In or Stock Out via modal (automatically updating product stock) or export the Inventory List to CSV.'
      },
      {
        selector: '.page-body > .card .table',
        title: 'Current Inventory List',
        description: 'View stock quantities, reorder levels, and status badges for every product.'
      },
      {
        selector: '.page-body > .row .col-lg-6:first-child',
        title: 'Recent Stock In',
        description: 'View recent Stock In transactions from suppliers.'
      },
      {
        selector: '.page-body > .row .col-lg-6:last-child',
        title: 'Recent Stock Out',
        description: 'View recent Stock Out transactions for customers.'
      },
      {
        selector: '.pagination-controls',
        title: 'Table Pagination',
        description: 'Browse 10 items per page across your inventory and transaction tables.'
      }
    ];
  }

  if (pathname === '/abc-analysis') {
    const base = [
      {
        selector: '.app-header-controls',
        title: 'Search & Filter Items',
        description: 'Search by item name or category, or open Filter to filter by Category and ABC Class.'
      },
      {
        selector: '.page-body > .row:first-of-type',
        title: 'Class A, B & C Cards',
        description:
          'Click Class A (≤ 70%), Class B (71%–90%), or Class C (> 90%) to filter the table by value class.'
      },
      {
        selector: '.page-tabs',
        title: 'ABC Analysis & Summary Tabs',
        description: 'Switch between the ABC Classification analysis and the Category Summary.'
      }
    ];

    if (activeTab.includes('Summary')) {
      return [
        ...base,
        {
          selector: '.page-body .table',
          title: 'Category Summary',
          description: 'Displays the total number of furniture items per category and the Grand Total.'
        }
      ];
    }

    return [
      ...base,
      {
        selector: '.page-body .card canvas',
        title: 'ABC Classification Chart',
        description: 'Visualizes how many products fall into Class A, Class B, and Class C.'
      },
      {
        selector: '.page-body .card:last-of-type .d-flex.align-items-center.gap-2',
        title: 'Import & Export CSV',
        description: 'Import your ABC Analysis CSV sheet or export the calculated results to CSV.'
      },
      {
        selector: '.page-body .table',
        title: 'ABC Analysis Result',
        description:
          'Edit Annual Demand inline to automatically recalculate Annual Consumption Value, % of Total, Cumulative %, and ABC Class.'
      },
      {
        selector: '.pagination-controls',
        title: 'Table Pagination',
        description: 'Browse 10 items per page using the pagination controls.'
      }
    ];
  }

  const ROUTE_STEPS = {
    '/products': [
      {
        selector: '.app-header-controls',
        title: 'Search & Filter Products',
        description:
          'Search by code, name, category, or supplier. Click Filter to filter by Category or Stock Status.'
      },
      {
        selector: '.page-body .btn-maroon',
        title: 'Add New Product',
        description:
          'Open the Add Product modal. Product codes are auto-generated behind the scenes.'
      },
      {
        selector: '.page-body .table',
        title: 'Furniture Product Catalog',
        description: 'View Category, Size/Spec, Type, Supplier, Price, Stock, and Status.'
      },
      {
        selector: '.page-body .table-action-toolbar',
        title: 'Row Actions Dropdown',
        description:
          'Select Edit or Delete from the Actions dropdown, then click any row in the table to perform that action.'
      },
      {
        selector: '.pagination-controls',
        title: '10-Row Pagination',
        description: 'Navigate through all 320+ furniture items 10 rows at a time.'
      }
    ],
    '/suppliers': [
      {
        selector: '.app-header-controls',
        title: 'Search & Filter Suppliers',
        description: 'Search suppliers or filter by Active / Inactive status.'
      },
      {
        selector: '.page-body .btn-maroon',
        title: 'Add Supplier',
        description: 'Register a new supplier with an automatically generated Supplier ID.'
      },
      {
        selector: '.page-body .table',
        title: 'Supplier Directory',
        description: 'View contact details and edit or delete suppliers.'
      },
      {
        selector: '.pagination-controls',
        title: 'Table Pagination',
        description: 'Browse suppliers 10 rows per page.'
      }
    ],
    '/customers': [
      {
        selector: '.app-header-controls',
        title: 'Search & Filter Customers',
        description: 'Search customers or filter by Active, Occasional, or Inactive status.'
      },
      {
        selector: '.page-body .btn-maroon',
        title: 'Add Customer',
        description: 'Add a new customer with an auto-generated Customer ID.'
      },
      {
        selector: '.page-body .table',
        title: 'Customer Directory',
        description: 'Track contact info, total orders, and edit or delete customers.'
      },
      {
        selector: '.pagination-controls',
        title: 'Table Pagination',
        description: 'Browse customers 10 rows per page.'
      }
    ],
    '/purchase-orders': [
      {
        selector: '.app-header-controls',
        title: 'Search & Filter POs',
        description: 'Filter Purchase Orders by Supplier or Status (Approved, Pending, Cancelled).'
      },
      {
        selector: '.page-body .btn-maroon',
        title: 'Create Purchase Order',
        description: 'Create a new PO with an auto-generated PO number.'
      },
      {
        selector: '.page-body .table',
        title: 'Purchase Order List',
        description: 'Review order dates, expected deliveries, totals, and approval status.'
      },
      {
        selector: '.page-body .table-action-toolbar',
        title: 'Row Actions Dropdown',
        description:
          'Choose Edit, Print, or Delete from the Actions dropdown, then click any row to run that action.'
      },
      {
        selector: '.pagination-controls',
        title: 'Table Pagination',
        description: 'Browse Purchase Orders 10 rows per page.'
      }
    ],
    '/receiving': [
      {
        selector: '.app-header-controls',
        title: 'Search & Filter Receiving',
        description: 'Filter records by Condition (Good, Damaged, Incomplete) or Status.'
      },
      {
        selector: '.page-body .btn-maroon',
        title: 'Receive Goods',
        description:
          'Select an Approved Purchase Order to preview its details and auto-fill the supplier before saving.'
      },
      {
        selector: '.page-body .table',
        title: 'Receiving History',
        description: 'Track received deliveries and inspection statuses.'
      },
      {
        selector: '.page-body .table-action-toolbar',
        title: 'Row Actions Dropdown',
        description:
          'Choose Edit or Delete from the Actions dropdown, then click any receiving row to update or remove it.'
      }
    ],
    '/delivery': [
      {
        selector: '.app-header-controls',
        title: 'Search & Filter Deliveries',
        description: 'Filter Delivery Receipts by Preparing, Out for Delivery, or Delivered.'
      },
      {
        selector: '.page-body .btn-maroon',
        title: 'Create Delivery Receipt',
        description: 'Create a new DR with an auto-generated DR number.'
      },
      {
        selector: '.page-body .table',
        title: 'Delivery History',
        description: 'Monitor driver assignments, delivery dates, and statuses.'
      },
      {
        selector: '.page-body .table-action-toolbar',
        title: 'Row Actions Dropdown',
        description:
          'Choose Edit, Print, or Delete from the Actions dropdown, then click any row to run that action.'
      }
    ],
    '/reports': [
      {
        selector: '.page-body > .row:first-of-type',
        title: 'Inventory & Sales Totals',
        description: 'View live totals for Inventory, Stock In, Stock Out, and Total Sales.'
      },
      {
        selector: '.page-body > .row:nth-of-type(2)',
        title: 'Visual Analytics',
        description: 'Compare monthly inventory movement and stock status distribution.'
      },
      {
        selector: '.page-body .btn-success',
        title: 'Export CSV & Print PDF',
        description: 'Export inventory data to CSV or print a formatted PDF report.'
      },
      {
        selector: '.page-body .table',
        title: 'Generated Reports',
        description: 'Review available inventory, sales, low stock, and supplier reports.'
      }
    ],
    '/settings': [
      {
        selector: '.page-body > .row:first-of-type .col-lg-6:first-child',
        title: 'Company Information',
        description: 'Update your business name, address, contact number, and email.'
      },
      {
        selector: '.page-body > .row:first-of-type .col-lg-6:last-child',
        title: 'Administrator Account',
        description: 'Change the administrator display name, login username, or password.'
      },
      {
        selector: '.page-body > .row:nth-of-type(2)',
        title: 'Inventory Settings',
        description:
          'Toggle low stock notifications, auto-generated codes, and negative inventory rules.'
      }
    ]
  };

  return (
    ROUTE_STEPS[pathname] || [
      {
        selector: '.app-header',
        title: 'Navigation & Header',
        description:
          'Use the sidebar to switch modules and the top bar to search, filter, or manage your account.'
      }
    ]
  );
}

export default function FeatureTour() {
  const { pathname } = useLocation();
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  }));
  const popoverRef = useRef(null);

  const currentStep = steps[stepIndex];

  const measureTarget = useCallback(() => {
    setViewport({
      width: window.innerWidth,
      height: window.innerHeight
    });

    if (!active || !currentStep) {
      setRect(null);
      return;
    }
    const el = document.querySelector(currentStep.selector);
    if (!el) {
      setRect(null);
      return;
    }
    const initialRect = el.getBoundingClientRect();
    const isTall = initialRect.height > window.innerHeight * 0.65;
    el.scrollIntoView({
      behavior: 'smooth',
      block: isTall ? 'nearest' : 'center',
      inline: 'nearest'
    });
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setRect({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height
        });
      }
    };
    update();
    const t = setTimeout(update, 260);
    return () => clearTimeout(t);
  }, [active, currentStep]);

  useEffect(() => {
    setActive(false);
    setStepIndex(0);
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    const cleanup = measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      cleanup?.();
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [active, stepIndex, measureTarget]);

  const startTour = () => {
    const rawSteps = getStepsForRoute(pathname);
    const vw = window.innerWidth;
    // Keep only steps whose target element currently exists, is visible, and is on-screen horizontally
    const visibleSteps = rawSteps.filter((s) => {
      const el = document.querySelector(s.selector);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < vw;
    });
    setSteps(visibleSteps.length > 0 ? visibleSteps : rawSteps);
    setStepIndex(0);
    setActive(true);
  };

  const nextStep = () => {
    if (stepIndex + 1 < steps.length) {
      setStepIndex((i) => i + 1);
    } else {
      setActive(false);
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const getPopoverStyle = () => {
    const vw = viewport.width;
    const vh = viewport.height;
    const margin = 12;
    const isMobile = vw <= 640;
    const cardWidth = isMobile ? vw - margin * 2 : Math.min(360, vw - margin * 2);
    const popH = popoverRef.current?.offsetHeight || 205;

    if (!rect) {
      return {
        width: `${cardWidth}px`,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const spaceRight = vw - (rect.left + rect.width);
    const spaceLeft = rect.left;

    if (isMobile) {
      // On mobile, span full width with 12px margins and place where it fits cleanly
      if (spaceBelow >= popH + 16) {
        return {
          width: `${cardWidth}px`,
          top: `${Math.min(vh - popH - margin, rect.top + rect.height + 12)}px`,
          left: `${margin}px`
        };
      }
      if (spaceAbove >= popH + 16) {
        return {
          width: `${cardWidth}px`,
          top: `${Math.max(margin, rect.top - popH - 12)}px`,
          left: `${margin}px`
        };
      }
      // If target fills most of the mobile screen, dock at bottom or top away from target center
      const targetCenterY = rect.top + rect.height / 2;
      if (targetCenterY < vh / 2) {
        return {
          width: `${cardWidth}px`,
          bottom: `${margin}px`,
          left: `${margin}px`
        };
      }
      return {
        width: `${cardWidth}px`,
        top: `${margin}px`,
        left: `${margin}px`
      };
    }

    // Tablet & Desktop: try below, above, right, left, then clamped fallback
    if (spaceBelow >= popH + 18) {
      return {
        width: `${cardWidth}px`,
        top: `${rect.top + rect.height + 14}px`,
        left: `${Math.max(margin, Math.min(vw - cardWidth - margin, rect.left))}px`
      };
    }

    if (spaceAbove >= popH + 18) {
      return {
        width: `${cardWidth}px`,
        top: `${Math.max(margin, rect.top - popH - 14)}px`,
        left: `${Math.max(margin, Math.min(vw - cardWidth - margin, rect.left))}px`
      };
    }

    if (spaceRight >= cardWidth + 24) {
      return {
        width: `${cardWidth}px`,
        top: `${Math.max(margin, Math.min(vh - popH - margin, rect.top))}px`,
        left: `${rect.left + rect.width + 14}px`
      };
    }

    if (spaceLeft >= cardWidth + 24) {
      return {
        width: `${cardWidth}px`,
        top: `${Math.max(margin, Math.min(vh - popH - margin, rect.top))}px`,
        left: `${Math.max(margin, rect.left - cardWidth - 14)}px`
      };
    }

    // Tall element fallback on tablet/desktop
    const top = Math.max(margin, Math.min(vh - popH - margin, vh - popH - margin));
    const left = Math.max(margin, Math.min(vw - cardWidth - margin, rect.left));
    return {
      width: `${cardWidth}px`,
      top: `${top}px`,
      left: `${left}px`
    };
  };

  const getSpotlightStyle = () => {
    if (!rect) return null;
    const vw = viewport.width;
    const vh = viewport.height;
    const sLeft = Math.max(4, rect.left - 6);
    const sTop = Math.max(4, rect.top - 6);
    const sWidth = Math.max(24, Math.min(vw - sLeft - 4, rect.width + 12));
    const sHeight = Math.max(24, Math.min(vh - sTop - 4, rect.height + 12));
    return {
      top: `${sTop}px`,
      left: `${sLeft}px`,
      width: `${sWidth}px`,
      height: `${sHeight}px`
    };
  };

  const spotlightStyle = getSpotlightStyle();

  return (
    <>
      {!active && (
        <button
          type="button"
          className="tour-fab"
          onClick={startTour}
          title="Feature Tour"
          aria-label="Start Feature Tour"
        >
          <i className="fas fa-question" />
        </button>
      )}

      {active && currentStep && (
        <div
          className="tour-overlay"
          style={{ background: !rect ? 'rgba(15, 23, 42, 0.58)' : 'transparent' }}
          onClick={() => setActive(false)}
        >
          {spotlightStyle && (
            <div
              className="tour-spotlight"
              style={spotlightStyle}
              onClick={(e) => e.stopPropagation()}
            />
          )}

          <div
            ref={popoverRef}
            className="tour-popover"
            style={getPopoverStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="tour-step-pill">
                Step {stepIndex + 1} of {steps.length}
              </span>
              <button
                type="button"
                className="btn-close"
                style={{ fontSize: '12px' }}
                onClick={() => setActive(false)}
              />
            </div>

            <h6 className="fw-bold mb-1 text-dark">{currentStep.title}</h6>
            <p className="text-muted small mb-3">{currentStep.description}</p>

            <div className="d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-sm btn-link text-muted text-decoration-none px-0"
                onClick={() => setActive(false)}
              >
                Skip tour
              </button>
              <div className="d-flex gap-2">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={prevStep}
                  >
                    Back
                  </button>
                )}
                <button type="button" className="btn btn-sm btn-maroon" onClick={nextStep}>
                  {stepIndex + 1 < steps.length ? 'Next' : 'Finish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
