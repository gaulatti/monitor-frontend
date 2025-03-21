import { NavLink } from 'react-router';
import styled from '@emotion/styled';

/**
 * A styled component that represents the logo in the sidebar.
 * It is based on the `NavLink` component and has specific styles applied to it.
 *
 * Styles applied:
 * - Height: 66px
 * - Display: inline-block
 * - Padding-right: 1rem
 * - Line-height: 66px
 * - Font-size: 2rem
 * - Text-align: center
 * - Font-family: 'Comodo', sans-serif
 */
const Logo = styled(NavLink)`
  height: 66px;
  display: inline-block;
  padding-right: 1rem;
  line-height: 66px;
  font-size: 2rem;
  text-align: center;
  font-family: 'Comodo', sans-serif;
`;


export { Logo };
