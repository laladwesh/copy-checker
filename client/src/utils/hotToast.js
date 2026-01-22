import toast from 'react-hot-toast';

export const toastSuccess = (msg) => toast.success(msg);
export const toastError = (msg) => toast.error(msg);
export const toastInfo = (msg) => toast(msg);

export default toast;
