import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="text-center p-8">
          <FileSearch className="w-16 h-16 mx-auto mb-6 text-gray-400" />
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">404</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 arabic-text">
            عذراً! الصفحة غير موجودة
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 arabic-text">
            الصفحة التي تبحث عنها غير متاحة أو تم نقلها
          </p>
          <Link to="/">
            <Button className="w-full arabic-text">
              <Home className="w-4 h-4 ml-2" />
              العودة للصفحة الرئيسية
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
