import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AppIcon } from '../shared';
import { getAppNavItem, getNavItemsForRole } from '../../config/appNavigation';
import { useTheme } from '../../context/ThemeContext';
import { useDemoRole } from '../../context/DemoRoleContext';
import '../../styles/internal.css';
import styles from './AppShell.module.css';

const groups = ['Command', 'Field', 'Intelligence', 'Partners'] as const;

export function AppShell() {
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const { role, roleLabel, isRolePreview, clearRole } = useDemoRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const current = getAppNavItem(location.pathname);
  const roleNavItems = useMemo(() => getNavItemsForRole(role), [role]);
  const grouped = useMemo(
    () =>
      groups.map((group) => ({
        group,
        items: roleNavItems.filter((item) => item.group === group),
      })).filter(({ items }) => items.length > 0),
    [roleNavItems]
  );

  return (
    <div className={styles.shell}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandMark}>
              <AppIcon name="network" size={20} />
            </span>
            <span className={styles.brandStack}>
              <span className={styles.brandText}>SevaSetu</span>
              <span className={styles.brandRole}>{roleLabel}</span>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Internal navigation">
            {grouped.map(({ group, items }) => (
              <div key={group} className={styles.navGroup}>
                <div className={styles.groupLabel}>{group}</div>
                {items.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                      data-accent={item.accent}
                    >
                      <span className={styles.navIcon}>
                        <AppIcon name={item.icon as any} size={16} />
                      </span>
                      <span className={styles.navLabel}>{item.label}</span>
                      {active && <span className={styles.activeBar} />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className={styles.sidebarFooter}>
            {isRolePreview ? (
              <button type="button" className={styles.resetRoleButton} onClick={clearRole}>
                Return to MVP demo view
              </button>
            ) : null}
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <AppIcon name={theme === 'light' ? 'spark' : 'constellation'} size={16} />
              <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <AppIcon name="layers" size={18} />
          </button>

          <div className={styles.topbarLeft}>
            <div className={styles.breadcrumb}>
              <Link to="/workspace" className={styles.breadcrumbLink}>Workspace</Link>
              <span className={styles.breadcrumbSep}>/</span>
              <span className={styles.breadcrumbCurrent}>{current.label}</span>
            </div>
          </div>

          <div className={styles.topbarRight}>
            <div className={styles.liveIndicator}>
              <span className={styles.liveDot} />
              <span>Live</span>
            </div>
            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <AppIcon name={theme === 'light' ? 'spark' : 'constellation'} size={16} />
            </button>
          </div>
        </header>

        <main className={styles.content} id="main-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
          >
            <motion.aside
              className={styles.mobileDrawer}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.drawerHeader}>
                <Link to="/" className={styles.brand} onClick={() => setSidebarOpen(false)}>
                  <span className={styles.brandMark}>
                    <AppIcon name="network" size={20} />
                  </span>
                  <span className={styles.brandStack}>
                    <span className={styles.brandText}>SevaSetu</span>
                    <span className={styles.brandRole}>{roleLabel}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className={styles.drawerClose}
                  onClick={() => setSidebarOpen(false)}
                >
                  <AppIcon name="check" size={16} />
                </button>
              </div>

              <nav className={styles.drawerNav}>
                {grouped.map(({ group, items }) => (
                  <div key={group} className={styles.navGroup}>
                    <div className={styles.groupLabel}>{group}</div>
                    {items.map((item) => {
                      const active = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`${styles.drawerLink} ${active ? styles.drawerLinkActive : ''}`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span className={styles.navIcon}>
                            <AppIcon name={item.icon as any} size={16} />
                          </span>
                          <div className={styles.drawerLinkText}>
                            <strong>{item.label}</strong>
                            <span>{item.description}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className={styles.sidebarFooter}>
                {isRolePreview ? (
                  <button type="button" className={styles.resetRoleButton} onClick={clearRole}>
                    Return to MVP demo view
                  </button>
                ) : null}
                <button type="button" className={styles.themeToggle} onClick={toggleTheme}>
                  <AppIcon name={theme === 'light' ? 'spark' : 'constellation'} size={16} />
                  <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AppShell;
