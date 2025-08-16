import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  Layout,
  Button,
  Stack,
  Text,
  Badge,
  Modal,
  FormLayout,
  TextField,
  Select,
  Banner,
  Spinner,
  EmptyState,
  ResourceList,
  ResourceItem,
  Avatar,
  ButtonGroup,
  Tabs,
  DataTable,
  Filters,
  ChoiceList,
  Tooltip,
  Icon,
  Tag,
  Collapsible,
  TextContainer,
  DisplayText,
  ProgressBar,
  Divider,
} from '@shopify/polaris';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
} from 'recharts';
import type { Audience } from '../services/api.server';

interface AudiencesProps {
  initialAudiences?: Audience[];
}

interface AudienceCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

interface AudienceFormData {
  name: string;
  description: string;
  type: 'custom' | 'lookalike' | 'interest' | 'behavioral';
  rules: {
    conditions: AudienceCondition[];
    logic: 'and' | 'or';
  };
}

interface AudienceBuilderProps {
  audience?: Audience;
  onSubmit: (data: AudienceFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const FIELD_OPTIONS = [
  { label: 'Purchase History', value: 'purchase_history' },
  { label: 'Page Views', value: 'page_views' },
  { label: 'Time on Site', value: 'time_on_site' },
  { label: 'Purchase Amount', value: 'purchase_amount' },
  { label: 'Visit Frequency', value: 'visit_frequency' },
  { label: 'Product Category', value: 'product_category' },
  { label: 'Geography', value: 'geography' },
  { label: 'Device Type', value: 'device_type' },
  { label: 'Traffic Source', value: 'traffic_source' },
  { label: 'Customer Lifetime Value', value: 'clv' },
];

const OPERATOR_OPTIONS = [
  { label: 'Equals', value: 'equals' },
  { label: 'Contains', value: 'contains' },
  { label: 'Greater than', value: 'greater_than' },
  { label: 'Less than', value: 'less_than' },
  { label: 'Is in', value: 'in' },
  { label: 'Is not in', value: 'not_in' },
];

const AUDIENCE_TYPES = [
  { label: 'Custom Audience', value: 'custom' },
  { label: 'Lookalike Audience', value: 'lookalike' },
  { label: 'Interest-based', value: 'interest' },
  { label: 'Behavioral', value: 'behavioral' },
];

const ConditionBuilder: React.FC<{
  condition: AudienceCondition;
  onUpdate: (condition: AudienceCondition) => void;
  onRemove: () => void;
}> = ({ condition, onUpdate, onRemove }) => {
  const getValueInput = () => {
    const isNumeric = ['greater_than', 'less_than'].includes(condition.operator);
    const isMultiple = ['in', 'not_in'].includes(condition.operator);

    if (isMultiple) {
      return (
        <TextField
          value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value || ''}
          onChange={(value) => 
            onUpdate({ 
              ...condition, 
              value: value.split(',').map(v => v.trim()).filter(Boolean) 
            })
          }
          placeholder="value1, value2, value3"
          helpText="Separate multiple values with commas"
        />
      );
    }

    return (
      <TextField
        type={isNumeric ? 'number' : 'text'}
        value={condition.value?.toString() || ''}
        onChange={(value) => 
          onUpdate({ 
            ...condition, 
            value: isNumeric ? parseFloat(value) || 0 : value 
          })
        }
        placeholder={isNumeric ? '100' : 'Enter value'}
      />
    );
  };

  return (
    <Card>
      <Card.Section>
        <Stack distribution="fill">
          <Stack.Item fill>
            <FormLayout>
              <FormLayout.Group>
                <Select
                  label="Field"
                  options={FIELD_OPTIONS}
                  value={condition.field}
                  onChange={(value) => onUpdate({ ...condition, field: value })}
                />
                
                <Select
                  label="Operator"
                  options={OPERATOR_OPTIONS}
                  value={condition.operator}
                  onChange={(value) => onUpdate({ ...condition, operator: value as any })}
                />
              </FormLayout.Group>
              
              <div>
                <Text variant="bodyMd" fontWeight="medium">Value</Text>
                {getValueInput()}
              </div>
            </FormLayout>
          </Stack.Item>
          
          <Stack.Item>
            <Button destructive onClick={onRemove} size="slim">
              Remove
            </Button>
          </Stack.Item>
        </Stack>
      </Card.Section>
    </Card>
  );
};

const AudienceBuilder: React.FC<AudienceBuilderProps> = ({
  audience,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<AudienceFormData>({
    name: audience?.name || '',
    description: audience?.description || '',
    type: audience?.type || 'custom',
    rules: {
      conditions: audience?.rules?.conditions || [
        { field: 'purchase_history', operator: 'equals', value: '' }
      ],
      logic: audience?.rules?.logic || 'and',
    },
  });

  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [sizeLoading, setSizeLoading] = useState(false);

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        conditions: [
          ...prev.rules.conditions,
          { field: 'purchase_history', operator: 'equals', value: '' }
        ],
      },
    }));
  };

  const updateCondition = (index: number, condition: AudienceCondition) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        conditions: prev.rules.conditions.map((c, i) => i === index ? condition : c),
      },
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        conditions: prev.rules.conditions.filter((_, i) => i !== index),
      },
    }));
  };

  // Estimate audience size
  const estimateAudienceSize = async () => {
    setSizeLoading(true);
    try {
      const response = await fetch('/api/audiences/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.rules),
      });
      const data = await response.json();
      if (data.success) {
        setEstimatedSize(data.size);
      }
    } catch (error) {
      console.error('Error estimating audience size:', error);
    } finally {
      setSizeLoading(false);
    }
  };

  const logicOptions = [
    { label: 'AND (all conditions must match)', value: 'and' },
    { label: 'OR (any condition can match)', value: 'or' },
  ];

  return (
    <FormLayout>
      <TextField
        label="Audience Name"
        value={formData.name}
        onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
        placeholder="High-value customers"
        autoComplete="off"
      />

      <TextField
        label="Description"
        value={formData.description}
        onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
        placeholder="Customers who have made purchases over $500"
        multiline={3}
      />

      <Select
        label="Audience Type"
        options={AUDIENCE_TYPES}
        value={formData.type}
        onChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
      />

      <Card title="Audience Rules">
        <Card.Section>
          <Stack vertical>
            <Stack distribution="equalSpacing">
              <Text variant="headingMd">Conditions</Text>
              <Button onClick={addCondition} size="slim">
                Add Condition
              </Button>
            </Stack>

            <Select
              label="Logic"
              options={logicOptions}
              value={formData.rules.logic}
              onChange={(value) => 
                setFormData(prev => ({
                  ...prev,
                  rules: { ...prev.rules, logic: value as any },
                }))
              }
              helpText="How should multiple conditions be combined?"
            />

            <Stack vertical>
              {formData.rules.conditions.map((condition, index) => (
                <div key={index}>
                  {index > 0 && (
                    <div style={{ textAlign: 'center', margin: '8px 0' }}>
                      <Badge status="info">
                        {formData.rules.logic.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                  <ConditionBuilder
                    condition={condition}
                    onUpdate={(updated) => updateCondition(index, updated)}
                    onRemove={() => removeCondition(index)}
                  />
                </div>
              ))}
            </Stack>
          </Stack>
        </Card.Section>

        <Card.Section>
          <Stack distribution="equalSpacing">
            <Button onClick={estimateAudienceSize} loading={sizeLoading}>
              Estimate Audience Size
            </Button>
            
            {estimatedSize !== null && (
              <Stack spacing="tight">
                <Text variant="bodyMd">Estimated size:</Text>
                <Badge status="success">
                  {estimatedSize.toLocaleString()} users
                </Badge>
              </Stack>
            )}
          </Stack>
        </Card.Section>
      </Card>

      <Stack distribution="trailing">
        <ButtonGroup>
          <Button onClick={onCancel}>Cancel</Button>
          <Button 
            primary 
            onClick={handleSubmit} 
            loading={loading}
            disabled={!formData.name || formData.rules.conditions.length === 0}
          >
            {audience ? 'Update Audience' : 'Create Audience'}
          </Button>
        </ButtonGroup>
      </Stack>
    </FormLayout>
  );
};

const AudienceCard: React.FC<{
  audience: Audience;
  onEdit: (audience: Audience) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}> = ({ audience, onEdit, onDelete, onToggleStatus }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { color: 'success' as const, text: 'Active' },
      inactive: { color: 'subdued' as const, text: 'Inactive' },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.inactive;
    return <Badge status={config.color}>{config.text}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeMap = {
      custom: { color: 'info' as const, text: 'Custom' },
      lookalike: { color: 'attention' as const, text: 'Lookalike' },
      interest: { color: 'success' as const, text: 'Interest' },
      behavioral: { color: 'warning' as const, text: 'Behavioral' },
    };
    
    const config = typeMap[type as keyof typeof typeMap];
    return config ? <Badge status={config.color}>{config.text}</Badge> : <Badge>{type}</Badge>;
  };

  const formatCondition = (condition: AudienceCondition) => {
    const field = FIELD_OPTIONS.find(f => f.value === condition.field)?.label || condition.field;
    const operator = OPERATOR_OPTIONS.find(o => o.value === condition.operator)?.label || condition.operator;
    const value = Array.isArray(condition.value) ? condition.value.join(', ') : condition.value;
    
    return `${field} ${operator} "${value}"`;
  };

  return (
    <Card>
      <Card.Section>
        <Stack distribution="equalSpacing">
          <Stack vertical spacing="tight">
            <Stack spacing="tight">
              <Text variant="headingMd" fontWeight="semibold">
                {audience.name}
              </Text>
              {getStatusBadge(audience.status)}
              {getTypeBadge(audience.type)}
            </Stack>
            
            {audience.description && (
              <Text variant="bodyMd" color="subdued">
                {audience.description}
              </Text>
            )}
            
            <Stack spacing="tight">
              <Text variant="bodySm" color="subdued">
                Size: <strong>{audience.size.toLocaleString()}</strong> users
              </Text>
              <Text variant="bodySm" color="subdued">
                Created: {new Date(audience.createdAt).toLocaleDateString()}
              </Text>
            </Stack>

            {audience.performance && (
              <Stack spacing="tight">
                <Text variant="bodySm">
                  CTR: <strong>{audience.performance.ctr.toFixed(2)}%</strong>
                </Text>
                <Text variant="bodySm">
                  Conv. Rate: <strong>{audience.performance.conversionRate.toFixed(2)}%</strong>
                </Text>
              </Stack>
            )}
          </Stack>

          <ButtonGroup>
            <Button size="slim" onClick={() => onEdit(audience)}>
              Edit
            </Button>
            <Button 
              size="slim" 
              onClick={() => onToggleStatus(audience.id)}
            >
              {audience.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
            <Button size="slim" destructive onClick={() => onDelete(audience.id)}>
              Delete
            </Button>
          </ButtonGroup>
        </Stack>
      </Card.Section>

      <Card.Section>
        <Button
          plain
          onClick={() => setExpanded(!expanded)}
          ariaExpanded={expanded}
          ariaControls="audience-rules"
        >
          {expanded ? 'Hide' : 'Show'} Rules ({audience.rules.conditions.length})
        </Button>
        
        <Collapsible
          open={expanded}
          id="audience-rules"
          transition={{ duration: '150ms', timingFunction: 'ease' }}
        >
          <div style={{ marginTop: '16px' }}>
            <Stack vertical spacing="tight">
              <Text variant="bodyMd" fontWeight="medium">
                Logic: {audience.rules.logic.toUpperCase()}
              </Text>
              
              {audience.rules.conditions.map((condition, index) => (
                <div key={index}>
                  {index > 0 && (
                    <Text variant="bodySm" color="subdued">
                      {audience.rules.logic.toUpperCase()}
                    </Text>
                  )}
                  <Tag>{formatCondition(condition)}</Tag>
                </div>
              ))}
            </Stack>
          </div>
        </Collapsible>
      </Card.Section>
    </Card>
  );
};

const AudiencePerformanceChart: React.FC<{
  audiences: Audience[];
}> = ({ audiences }) => {
  const data = audiences
    .filter(a => a.performance)
    .map(audience => ({
      name: audience.name.length > 15 ? `${audience.name.slice(0, 15)}...` : audience.name,
      ctr: audience.performance!.ctr,
      conversionRate: audience.performance!.conversionRate,
      size: audience.size,
    }));

  return (
    <Card>
      <Card.Section>
        <Stack vertical>
          <Text variant="headingMd">Audience Performance</Text>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip 
                  formatter={(value: any, name: string) => [
                    `${value.toFixed(2)}%`, 
                    name === 'ctr' ? 'CTR' : 'Conversion Rate'
                  ]}
                />
                <Bar dataKey="ctr" fill="#5C6AC4" name="ctr" />
                <Bar dataKey="conversionRate" fill="#00A047" name="conversionRate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Stack>
      </Card.Section>
    </Card>
  );
};

const AudienceTypeDistribution: React.FC<{
  audiences: Audience[];
}> = ({ audiences }) => {
  const typeCounts = audiences.reduce((acc, audience) => {
    acc[audience.type] = (acc[audience.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(typeCounts).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
  }));

  const colors = ['#5C6AC4', '#00A047', '#EEC200', '#D72C0D'];

  return (
    <Card>
      <Card.Section>
        <Stack vertical>
          <Text variant="headingMd">Audience Types</Text>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Stack>
      </Card.Section>
    </Card>
  );
};

export const Audiences: React.FC<AudiencesProps> = ({ initialAudiences = [] }) => {
  const [audiences, setAudiences] = useState<Audience[]>(initialAudiences);
  const [loading, setLoading] = useState(!initialAudiences.length);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAudience, setEditingAudience] = useState<Audience | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Filter states
  const [queryValue, setQueryValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  // Load audiences
  const loadAudiences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/audiences');
      const data = await response.json();
      
      if (data.success) {
        setAudiences(data.data);
      } else {
        setError(data.error || 'Failed to load audiences');
      }
    } catch (err) {
      setError('Network error while loading audiences');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!initialAudiences.length) {
      loadAudiences();
    }
  }, []);

  // Filter audiences
  const filteredAudiences = audiences.filter(audience => {
    // Text search
    if (queryValue && !audience.name.toLowerCase().includes(queryValue.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (statusFilter.length > 0 && !statusFilter.includes(audience.status)) {
      return false;
    }
    
    // Type filter
    if (typeFilter.length > 0 && !typeFilter.includes(audience.type)) {
      return false;
    }
    
    return true;
  });

  // Handle audience actions
  const handleCreateAudience = async (data: AudienceFormData) => {
    try {
      setFormLoading(true);
      
      const response = await fetch('/api/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAudiences(prev => [...prev, result.data]);
        setShowCreateModal(false);
      } else {
        setError(result.error || 'Failed to create audience');
      }
    } catch (err) {
      setError('Network error while creating audience');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateAudience = async (data: AudienceFormData) => {
    if (!editingAudience) return;
    
    try {
      setFormLoading(true);
      
      const response = await fetch(`/api/audiences/${editingAudience.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAudiences(prev => 
          prev.map(a => a.id === editingAudience.id ? result.data : a)
        );
        setEditingAudience(null);
      } else {
        setError(result.error || 'Failed to update audience');
      }
    } catch (err) {
      setError('Network error while updating audience');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const audience = audiences.find(a => a.id === id);
    if (!audience) return;
    
    const newStatus = audience.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`/api/audiences/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAudiences(prev => 
          prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
        );
      } else {
        setError(result.error || 'Failed to update audience status');
      }
    } catch (err) {
      setError('Network error while updating audience status');
    }
  };

  const handleDeleteAudience = async (id: string) => {
    if (!confirm('Are you sure you want to delete this audience?')) return;
    
    try {
      const response = await fetch(`/api/audiences/${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        setAudiences(prev => prev.filter(a => a.id !== id));
      } else {
        setError(result.error || 'Failed to delete audience');
      }
    } catch (err) {
      setError('Network error while deleting audience');
    }
  };

  // Filter options
  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  const typeOptions = [
    { label: 'Custom', value: 'custom' },
    { label: 'Lookalike', value: 'lookalike' },
    { label: 'Interest', value: 'interest' },
    { label: 'Behavioral', value: 'behavioral' },
  ];

  // Applied filters for display
  const appliedFilters: any[] = [];
  if (statusFilter.length > 0) {
    appliedFilters.push({
      key: 'status',
      label: `Status: ${statusFilter.join(', ')}`,
      onRemove: () => setStatusFilter([]),
    });
  }
  if (typeFilter.length > 0) {
    appliedFilters.push({
      key: 'type',
      label: `Type: ${typeFilter.join(', ')}`,
      onRemove: () => setTypeFilter([]),
    });
  }

  const tabs = [
    { id: 'audiences', content: 'All Audiences', accessibilityLabel: 'All audiences' },
    { id: 'analytics', content: 'Analytics', accessibilityLabel: 'Audience analytics' },
  ];

  if (error) {
    return (
      <Page title="Audiences">
        <Banner status="critical" title="Error loading audiences">
          <p>{error}</p>
          <Button onClick={loadAudiences}>Retry</Button>
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      title="Audiences"
      subtitle={`${audiences.length} total audiences`}
      primaryAction={{
        content: 'Create Audience',
        onAction: () => setShowCreateModal(true),
      }}
      secondaryActions={[
        {
          content: 'Refresh',
          onAction: loadAudiences,
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            {selectedTab === 0 && (
              <Card>
                <div style={{ padding: '16px' }}>
                  <Filters
                    queryValue={queryValue}
                    queryPlaceholder="Search audiences..."
                    onQueryChange={setQueryValue}
                    onQueryClear={() => setQueryValue('')}
                    filters={[
                      {
                        key: 'status',
                        label: 'Status',
                        filter: (
                          <ChoiceList
                            title="Status"
                            titleHidden
                            choices={statusOptions}
                            selected={statusFilter}
                            onChange={setStatusFilter}
                            allowMultiple
                          />
                        ),
                        shortcut: true,
                      },
                      {
                        key: 'type',
                        label: 'Type',
                        filter: (
                          <ChoiceList
                            title="Type"
                            titleHidden
                            choices={typeOptions}
                            selected={typeFilter}
                            onChange={setTypeFilter}
                            allowMultiple
                          />
                        ),
                        shortcut: true,
                      },
                    ]}
                    appliedFilters={appliedFilters}
                    onClearAll={() => {
                      setStatusFilter([]);
                      setTypeFilter([]);
                    }}
                  />
                </div>

                {loading ? (
                  <Card.Section>
                    <Stack alignment="center">
                      <Spinner size="large" />
                      <Text>Loading audiences...</Text>
                    </Stack>
                  </Card.Section>
                ) : filteredAudiences.length === 0 ? (
                  <Card.Section>
                    <EmptyState
                      heading="No audiences found"
                      description="Create your first audience to start targeting specific customer segments"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      primaryAction={{
                        content: 'Create Audience',
                        onAction: () => setShowCreateModal(true),
                      }}
                    />
                  </Card.Section>
                ) : (
                  <Layout>
                    {filteredAudiences.map(audience => (
                      <Layout.Section key={audience.id}>
                        <AudienceCard
                          audience={audience}
                          onEdit={setEditingAudience}
                          onDelete={handleDeleteAudience}
                          onToggleStatus={handleToggleStatus}
                        />
                      </Layout.Section>
                    ))}
                  </Layout>
                )}
              </Card>
            )}

            {selectedTab === 1 && (
              <Layout>
                <Layout.Section oneHalf>
                  <AudiencePerformanceChart audiences={filteredAudiences} />
                </Layout.Section>
                
                <Layout.Section oneHalf>
                  <AudienceTypeDistribution audiences={filteredAudiences} />
                </Layout.Section>
              </Layout>
            )}
          </Tabs>
        </Layout.Section>
      </Layout>

      {/* Create Audience Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Audience"
        large
      >
        <Modal.Section>
          <AudienceBuilder
            onSubmit={handleCreateAudience}
            onCancel={() => setShowCreateModal(false)}
            loading={formLoading}
          />
        </Modal.Section>
      </Modal>

      {/* Edit Audience Modal */}
      <Modal
        open={!!editingAudience}
        onClose={() => setEditingAudience(null)}
        title="Edit Audience"
        large
      >
        <Modal.Section>
          {editingAudience && (
            <AudienceBuilder
              audience={editingAudience}
              onSubmit={handleUpdateAudience}
              onCancel={() => setEditingAudience(null)}
              loading={formLoading}
            />
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
};

export default Audiences;