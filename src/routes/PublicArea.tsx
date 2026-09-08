import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/auth/Login';
import SignUp from '../pages/auth/SignUp';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import VerifyEmail from '../pages/auth/VerifyEmail';
import ResendVerification from '../pages/auth/ResendVerification';
import PublicInfo from '../pages/PublicInfo';
import NotFound from '../pages/NotFound';

export default function PublicArea() {
  return <Routes>
    <Route path="/" element={<Home />} /><Route path="/login" element={<Login />} /><Route path="/signup" element={<SignUp />} />
    <Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/verify-email" element={<VerifyEmail />} /><Route path="/resend-verification" element={<ResendVerification />} />
    {['/privacy', '/terms', '/child-data', '/account-deletion', '/accessibility'].map((path) => <Route key={path} path={path} element={<PublicInfo />} />)}
    <Route path="*" element={<NotFound />} />
  </Routes>;
}
