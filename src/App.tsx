import { useState } from 'react';
import { Layout } from './components/common/Layout';
import { TabNavigation, TabType } from './components/common/TabNavigation';
import { TopologyView } from './components/topology-editor/TopologyView';
import { SettingsView } from './components/settings/SettingsView';
import { AnalysisView } from './components/analysis/AnalysisView';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('topology');

  return (
    <Layout>
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === 'topology' && <TopologyView />}
      {activeTab === 'settings' && <SettingsView />}
      {activeTab === 'analysis' && <AnalysisView />}
    </Layout>
  );
}

export default App;
