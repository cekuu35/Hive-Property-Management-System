import { useState } from "react";
import { Search, Building, User, Wrench, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useSearch } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";

export const SearchDropdown = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, loading } = useSearch(query);
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'property':
        return <Building className="h-4 w-4" />;
      case 'tenant':
        return <User className="h-4 w-4" />;
      case 'request':
        return <Wrench className="h-4 w-4" />;
      case 'unit':
        return <Home className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getStatusColor = (type: string, metadata?: any) => {
    if (type === 'request') {
      const status = metadata?.status;
      if (status === 'completed') return 'default';
      if (status === 'in_progress') return 'secondary';
      if (status === 'pending') return 'destructive';
    }
    return 'outline';
  };

  const handleResultClick = (result: any) => {
    if (result.url) {
      navigate(result.url);
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative flex-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search properties, tenants, or requests..."
              className="pl-10 bg-background/50"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(e.target.value.length >= 2);
              }}
              onFocus={() => {
                if (query.length >= 2) setOpen(true);
              }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <Command>
            <CommandList>
              {loading && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Searching...
                </div>
              )}
              
              {!loading && query.length >= 2 && results.length === 0 && (
                <CommandEmpty>No results found for "{query}"</CommandEmpty>
              )}
              
              {!loading && results.length > 0 && (
                <CommandGroup heading="Search Results">
                  {results.map((result) => (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      className="flex items-start gap-3 p-3 cursor-pointer"
                      onSelect={() => handleResultClick(result)}
                    >
                      <div className="flex items-center gap-2 mt-0.5">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {result.title}
                          </p>
                          <Badge 
                            variant={getStatusColor(result.type, result.metadata)}
                            className="text-xs capitalize"
                          >
                            {result.type}
                          </Badge>
                          {result.type === 'request' && result.metadata?.priority && (
                            <Badge 
                              variant={result.metadata.priority === 'high' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {result.metadata.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {query.length < 2 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Type at least 2 characters to search...
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};